/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsBulkResponse } from '@kbn/core/server';
import { get, isEmpty } from 'lodash';
import type {
  CaseAssignees,
  CaseCustomField,
  CaseCustomFields,
  CaseUserProfile,
  UserActionAction,
  UserActionType,
} from '../../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import type { UserActionPersistedAttributes } from '../../../common/types/user_actions';
import { UserActionPersistedAttributesRt } from '../../../common/types/user_actions';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../../common/constants';
import { arraysDifference } from '../../../client/utils';
import { isUserActionType } from '../../../../common/utils/user_actions';
import { decodeOrThrow } from '../../../common/runtime_types';
import { BuilderFactory } from '../builder_factory';
import type {
  BuildUserActionsDictParams,
  BuilderParameters,
  BulkCreateAttachmentUserAction,
  BulkCreateBulkUpdateCaseUserActions,
  CommonUserActionArgs,
  CreatePayloadFunction,
  CreateUserActionES,
  GetUserActionItemByDifference,
  PostCaseUserActionArgs,
  ServiceContext,
  TypedUserActionDiffedItems,
  UserActionEvent,
  UserActionsDict,
  CreateUserActionArgs,
  BulkCreateUserActionArgs,
} from '../types';
import { isAssigneesArray, isCustomFieldsArray, isStringArray } from '../type_guards';
import type { IndexRefresh } from '../../types';
import { UserActionAuditLogger } from '../audit_logger';

export class UserActionPersister {
  private static readonly userActionFieldsAllowed: Set<string> = new Set(
    Object.keys(UserActionTypes)
  );

  private readonly builderFactory: BuilderFactory;
  private readonly auditLogger: UserActionAuditLogger;

  constructor(private readonly context: ServiceContext) {
    this.builderFactory = new BuilderFactory({
      persistableStateAttachmentTypeRegistry: this.context.persistableStateAttachmentTypeRegistry,
    });

    this.auditLogger = new UserActionAuditLogger(this.context.auditLogger);
  }

  public buildUserActions({ updatedCases, user }: BuildUserActionsDictParams): UserActionsDict {
    return updatedCases.cases.reduce<UserActionsDict>((acc, updatedCase) => {
      const originalCase = updatedCase.originalCase;

      if (originalCase == null) {
        return acc;
      }

      const caseId = updatedCase.caseId;
      const owner = originalCase.attributes.owner;

      const userActions: UserActionEvent[] = [];
      const updatedFields = Object.keys(updatedCase.updatedAttributes);

      updatedFields
        .filter((field) => UserActionPersister.userActionFieldsAllowed.has(field))
        .forEach((field) => {
          const originalValue = get(originalCase, ['attributes', field]);
          const newValue = get(updatedCase, ['updatedAttributes', field]);
          userActions.push(
            ...this.getUserActionItemByDifference({
              field,
              originalValue,
              newValue,
              user,
              owner,
              caseId,
            })
          );
        });

      acc[caseId] = userActions;
      return acc;
    }, {});
  }

  public async bulkCreateUpdateCase({
    builtUserActions,
    refresh,
  }: BulkCreateBulkUpdateCaseUserActions): Promise<void> {
    await this.bulkCreateAndLog({
      userActions: builtUserActions,
      refresh,
    });
  }

  private getUserActionItemByDifference(params: GetUserActionItemByDifference): UserActionEvent[] {
    const { field, originalValue, newValue, caseId, owner, user } = params;

    if (!UserActionPersister.userActionFieldsAllowed.has(field)) {
      return [];
    } else if (
      field === UserActionTypes.assignees &&
      isAssigneesArray(originalValue) &&
      isAssigneesArray(newValue)
    ) {
      return this.buildAssigneesUserActions({ ...params, originalValue, newValue });
    } else if (
      field === UserActionTypes.tags &&
      isStringArray(originalValue) &&
      isStringArray(newValue)
    ) {
      return this.buildTagsUserActions({ ...params, originalValue, newValue });
    } else if (
      field === UserActionTypes.customFields &&
      isCustomFieldsArray(originalValue) &&
      isCustomFieldsArray(newValue)
    ) {
      return this.buildCustomFieldsUserActions({ ...params, originalValue, newValue });
    } else if (isUserActionType(field) && newValue !== undefined) {
      const userActionBuilder = this.builderFactory.getBuilder(UserActionTypes[field]);
      const fieldUserAction = userActionBuilder?.build({
        caseId,
        owner,
        user,
        payload: { [field]: newValue },
      });

      return fieldUserAction ? [fieldUserAction] : [];
    }

    return [];
  }

  private buildAssigneesUserActions(params: TypedUserActionDiffedItems<CaseUserProfile>) {
    const createPayload: CreatePayloadFunction<
      CaseUserProfile,
      typeof UserActionTypes.assignees
    > = (items: CaseAssignees) => ({ assignees: items });

    return this.buildAddDeleteUserActions(params, createPayload, UserActionTypes.assignees);
  }

  private buildTagsUserActions(params: TypedUserActionDiffedItems<string>) {
    const createPayload: CreatePayloadFunction<string, typeof UserActionTypes.tags> = (
      items: string[]
    ) => ({
      tags: items,
    });

    return this.buildAddDeleteUserActions(params, createPayload, UserActionTypes.tags);
  }

  private buildCustomFieldsUserActions(params: TypedUserActionDiffedItems<CaseCustomField>) {
    const createPayload: CreatePayloadFunction<
      CaseCustomField,
      typeof UserActionTypes.customFields
    > = (items: CaseCustomFields) => ({ customFields: items });

    const { originalValue: originalCustomFields, newValue: newCustomFields } = params;

    const originalCustomFieldsKeys = new Set(
      originalCustomFields.map((customField) => customField.key)
    );

    const compareValues = arraysDifference(originalCustomFields, newCustomFields);

    const updatedCustomFieldsUsersActions = compareValues?.addedItems
      .filter((customField) => {
        if (customField.value != null) {
          return true;
        }

        return originalCustomFieldsKeys.has(customField.key);
      })
      .map((customField) =>
        this.buildUserAction({
          commonArgs: params,
          actionType: UserActionTypes.customFields,
          action: UserActionActions.update,
          createPayload,
          modifiedItems: [customField],
        })
      )
      .filter((userAction): userAction is UserActionEvent => userAction != null);

    return [...(updatedCustomFieldsUsersActions ? updatedCustomFieldsUsersActions : [])];
  }

  private buildAddDeleteUserActions<Item, ActionType extends UserActionType>(
    params: TypedUserActionDiffedItems<Item>,
    createPayload: CreatePayloadFunction<Item, ActionType>,
    actionType: ActionType
  ) {
    const { originalValue, newValue } = params;
    const compareValues = arraysDifference(originalValue, newValue);

    const addUserAction = this.buildUserAction({
      commonArgs: params,
      actionType,
      action: UserActionActions.add,
      createPayload,
      modifiedItems: compareValues?.addedItems,
    });
    const deleteUserAction = this.buildUserAction({
      commonArgs: params,
      actionType,
      action: UserActionActions.delete,
      createPayload,
      modifiedItems: compareValues?.deletedItems,
    });

    return [
      ...(addUserAction ? [addUserAction] : []),
      ...(deleteUserAction ? [deleteUserAction] : []),
    ];
  }

  private buildUserAction<Item, ActionType extends UserActionType>({
    commonArgs,
    actionType,
    action,
    createPayload,
    modifiedItems,
  }: {
    commonArgs: CommonUserActionArgs;
    actionType: ActionType;
    action: UserActionAction;
    createPayload: CreatePayloadFunction<Item, ActionType>;
    modifiedItems?: Item[] | null;
  }) {
    const userActionBuilder = this.builderFactory.getBuilder(actionType);

    if (!userActionBuilder || !modifiedItems || modifiedItems.length <= 0) {
      return;
    }

    const { caseId, owner, user } = commonArgs;

    const userAction = userActionBuilder.build({
      action,
      caseId,
      user,
      owner,
      payload: createPayload(modifiedItems),
    });

    return userAction;
  }

  public async bulkCreateAttachmentDeletion({
    caseId,
    attachments,
    user,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      caseId,
      attachments,
      user,
      action: UserActionActions.delete,
      refresh,
    });
  }

  public async bulkCreateAttachmentCreation({
    caseId,
    attachments,
    user,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      caseId,
      attachments,
      user,
      action: UserActionActions.create,
      refresh,
    });
  }

  private async bulkCreateAttachment({
    caseId,
    attachments,
    user,
    action = UserActionActions.create,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    this.context.log.debug(`Attempting to create a bulk create case user action`);

    if (attachments.length <= 0) {
      return;
    }

    const userActions = attachments.reduce<UserActionEvent[]>((acc, attachment) => {
      const userActionBuilder = this.builderFactory.getBuilder(UserActionTypes.comment);
      const commentUserAction = userActionBuilder?.build({
        action,
        caseId,
        user,
        owner: attachment.owner,
        attachmentId: attachment.id,
        payload: { attachment: attachment.attachment },
      });

      if (commentUserAction == null) {
        return acc;
      }

      return [...acc, commentUserAction];
    }, []);

    await this.bulkCreateAndLog({
      userActions,
      refresh,
    });
  }

  private async bulkCreateAndLog({
    userActions,
    refresh,
  }: { userActions: UserActionEvent[] } & IndexRefresh) {
    const createdUserActions = await this.bulkCreate({ actions: userActions, refresh });

    if (!createdUserActions) {
      return;
    }

    for (let i = 0; i < userActions.length; i++) {
      this.auditLogger.log(userActions[i].eventDetails, createdUserActions.saved_objects[i].id);
    }
  }

  private async bulkCreate({
    actions,
    refresh,
  }: PostCaseUserActionArgs): Promise<
    SavedObjectsBulkResponse<UserActionPersistedAttributes> | undefined
  > {
    if (isEmpty(actions)) {
      return;
    }

    try {
      this.context.log.debug(`Attempting to bulk create user actions`);

      return await this.context.unsecuredSavedObjectsClient.bulkCreate<UserActionPersistedAttributes>(
        actions.map((action) => {
          const decodedAttributes = decodeOrThrow(UserActionPersistedAttributesRt)(
            action.parameters.attributes
          );

          return {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            attributes: decodedAttributes,
            references: action.parameters.references,
          };
        }),
        { refresh }
      );
    } catch (error) {
      this.context.log.error(`Error on bulk creating user action: ${error}`);
      throw error;
    }
  }

  public async createUserAction<T extends keyof BuilderParameters>({
    userAction,
    refresh,
  }: CreateUserActionArgs<T>): Promise<void> {
    const { action, type, caseId, user, owner, payload, connectorId, attachmentId } = userAction;

    try {
      this.context.log.debug(`Attempting to create a user action of type: ${type}`);
      const userActionBuilder = this.builderFactory.getBuilder<T>(type);

      const userActionPayload = userActionBuilder?.build({
        action,
        caseId,
        user,
        owner,
        connectorId,
        attachmentId,
        payload,
      });

      if (userActionPayload) {
        await this.createAndLog({ userAction: userActionPayload, refresh });
      }
    } catch (error) {
      this.context.log.error(`Error on creating user action of type: ${type}. Error: ${error}`);
      throw error;
    }
  }

  public async bulkCreateUserAction<T extends keyof BuilderParameters>({
    userActions,
    refresh,
  }: BulkCreateUserActionArgs<T>): Promise<void> {
    try {
      this.context.log.debug(`Attempting to bulk create a user actions`);

      if (userActions.length <= 0) {
        return;
      }

      const userActionsPayload = userActions
        .map(({ action, type, caseId, user, owner, payload, connectorId, attachmentId }) => {
          const userActionBuilder = this.builderFactory.getBuilder<T>(type);
          const userAction = userActionBuilder?.build({
            action,
            caseId,
            user,
            owner,
            connectorId,
            attachmentId,
            payload,
          });

          if (userAction == null) {
            return null;
          }

          return userAction;
        })
        .filter(Boolean) as UserActionEvent[];

      await this.bulkCreateAndLog({ userActions: userActionsPayload, refresh });
    } catch (error) {
      this.context.log.error(`Error on bulk creating user actions. Error: ${error}`);
      throw error;
    }
  }

  private async createAndLog({
    userAction,
    refresh,
  }: {
    userAction: UserActionEvent;
  } & IndexRefresh): Promise<void> {
    const createdUserAction = await this.create({ ...userAction.parameters, refresh });

    this.auditLogger.log(userAction.eventDetails, createdUserAction.id);
  }

  private async create<T>({
    attributes,
    references,
    refresh,
  }: CreateUserActionES<T>): Promise<SavedObject<T>> {
    try {
      this.context.log.debug(`Attempting to POST a new case user action`);

      const decodedAttributes = decodeOrThrow(UserActionPersistedAttributesRt)(attributes);

      const res = await this.context.unsecuredSavedObjectsClient.create<T>(
        CASE_USER_ACTION_SAVED_OBJECT,
        decodedAttributes as unknown as T,
        {
          references: references ?? [],
          refresh,
        }
      );
      return res;
    } catch (error) {
      this.context.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }

  public async bulkAuditLogCaseDeletion(caseIds: string[]): Promise<void> {
    this.context.log.debug(`Attempting to log bulk case deletion`);

    for (const id of caseIds) {
      this.auditLogger.log({
        getMessage: () => `User deleted case id: ${id}`,
        action: UserActionActions.delete,
        descriptiveAction: 'case_user_action_delete_case',
        savedObjectId: id,
        savedObjectType: CASE_SAVED_OBJECT,
      });
    }
  }
}
