/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { UserActionFindRequestTypes } from '../../../../common/types/api';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../../routes/api';
import { defaultSortField } from '../../../common/utils';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../../common/constants';

import type { FindOptions, ServiceContext } from '../types';
import { transformFindResponseToExternalModel, transformToExternalModel } from '../transform';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../../../client/utils';
import type {
  UserActionPersistedAttributes,
  UserActionSavedObjectTransformed,
  UserActionTransformedAttributes,
} from '../../../common/types/user_actions';
import { bulkDecodeSOAttributes } from '../../utils';
import { UserActionTransformedAttributesRt } from '../../../common/types/user_actions';
import type { UserActionType } from '../../../../common/types/domain';
import {
  UserActionActions,
  UserActionTypes,
  AttachmentType,
} from '../../../../common/types/domain';

export class UserActionFinder {
  constructor(private readonly context: ServiceContext) {}

  public async find({
    caseId,
    sortOrder,
    types,
    page,
    perPage,
    filter,
  }: FindOptions): Promise<SavedObjectsFindResponse<UserActionTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to find user actions for case id: ${caseId}`);

      const finalFilter = combineFilters([filter, UserActionFinder.buildFilter(types)]);

      const userActions =
        await this.context.unsecuredSavedObjectsClient.find<UserActionPersistedAttributes>({
          type: CASE_USER_ACTION_SAVED_OBJECT,
          hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
          page: page ?? DEFAULT_PAGE,
          perPage: perPage ?? DEFAULT_PER_PAGE,
          sortField: 'created_at',
          sortOrder: sortOrder ?? 'asc',
          filter: finalFilter,
        });

      const res = transformFindResponseToExternalModel(
        userActions,
        this.context.persistableStateAttachmentTypeRegistry
      );

      const decodeRes = bulkDecodeSOAttributes(
        res.saved_objects,
        UserActionTransformedAttributesRt
      );

      return {
        ...res,
        saved_objects: res.saved_objects.map((so) => ({
          ...so,
          attributes: decodeRes.get(so.id) as UserActionTransformedAttributes,
        })),
      };
    } catch (error) {
      this.context.log.error(`Error finding user actions for case id: ${caseId}: ${error}`);
      throw error;
    }
  }

  private static buildFilter(types: FindOptions['types'] = []) {
    const filters = types.map((type) => UserActionFinder.buildFilterType(type));
    return combineFilters(filters, NodeBuilderOperators.or);
  }

  private static buildFilterType(type: UserActionFindRequestTypes): KueryNode | undefined {
    switch (type) {
      case 'action':
        return UserActionFinder.buildActionFilter();
      case 'user':
        return UserActionFinder.buildCommentTypeFilter();
      case 'alert':
        return UserActionFinder.buildAlertCommentTypeFilter();
      case 'attachment':
        return UserActionFinder.buildAttachmentsFilter();
      default:
        return UserActionFinder.buildGenericTypeFilter(type);
    }
  }

  private static buildActionFilter(): KueryNode | undefined {
    const filterForUserActionsExcludingComment = fromKueryExpression(
      `not ${CASE_USER_ACTION_SAVED_OBJECT}.attributes.payload.comment.type: ${AttachmentType.user}`
    );

    return filterForUserActionsExcludingComment;
  }

  private static buildCommentTypeFilter(): KueryNode | undefined {
    return combineFilters(
      [
        buildFilter({
          filters: [UserActionTypes.comment],
          field: 'type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
        buildFilter({
          filters: [AttachmentType.user],
          field: 'payload.comment.type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
      ],
      NodeBuilderOperators.and
    );
  }

  private static buildAlertCommentTypeFilter(): KueryNode | undefined {
    return combineFilters(
      [
        buildFilter({
          filters: [UserActionTypes.comment],
          field: 'type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
        buildFilter({
          filters: [AttachmentType.alert],
          field: 'payload.comment.type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
      ],
      NodeBuilderOperators.and
    );
  }

  private static buildAttachmentsFilter(): KueryNode | undefined {
    return combineFilters(
      [
        buildFilter({
          filters: [UserActionTypes.comment],
          field: 'type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
        buildFilter({
          filters: [AttachmentType.persistableState, AttachmentType.externalReference],
          field: 'payload.comment.type',
          operator: 'or',
          type: CASE_USER_ACTION_SAVED_OBJECT,
        }),
      ],
      NodeBuilderOperators.and
    );
  }

  private static buildGenericTypeFilter(type: UserActionType): KueryNode | undefined {
    return buildFilter({
      filters: [type],
      field: 'type',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });
  }

  public async findStatusChanges({
    caseId,
    filter,
  }: {
    caseId: string;
    filter?: KueryNode;
  }): Promise<UserActionSavedObjectTransformed[]> {
    try {
      this.context.log.debug('Attempting to find status changes');

      const updateActionFilter = buildFilter({
        filters: UserActionActions.update,
        field: 'action',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const statusChangeFilter = buildFilter({
        filters: UserActionTypes.status,
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const combinedFilters = combineFilters([updateActionFilter, statusChangeFilter, filter]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<UserActionPersistedAttributes>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            sortField: defaultSortField,
            sortOrder: 'asc',
            filter: combinedFilters,
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      let userActions: UserActionSavedObjectTransformed[] = [];

      for await (const findResults of finder.find()) {
        userActions = userActions.concat(
          findResults.saved_objects.map((so) => {
            const res = transformToExternalModel(
              so,
              this.context.persistableStateAttachmentTypeRegistry
            );

            const decodeRes = decodeOrThrow(UserActionTransformedAttributesRt)(res.attributes);

            return {
              ...res,
              attributes: decodeRes,
            };
          })
        );
      }

      return userActions;
    } catch (error) {
      this.context.log.error(`Error finding status changes: ${error}`);
      throw error;
    }
  }
}
