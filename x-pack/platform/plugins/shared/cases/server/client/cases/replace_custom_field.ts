/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CasesClient, CasesClientArgs } from '..';

import type { CustomFieldPutRequest } from '../../../common/types/api';
import { CustomFieldPutRequestRt, CaseRequestCustomFieldsRt } from '../../../common/types/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';
import type { CaseCustomField } from '../../../common/types/domain';
import { CaseCustomFieldRt } from '../../../common/types/domain';
import { validateCustomFieldTypesInRequest } from './validators';
import type { UserActionEvent } from '../../services/user_actions/types';
import { validateMaxUserActions } from '../../common/validators';
import { mergeCustomFieldsIntoExtendedFields } from '../../../common/utils/template_fields';

export interface ReplaceCustomFieldArgs {
  /**
   * The ID of a case
   */
  caseId: string;
  /**
   * The ID of a custom field to be updated
   */
  customFieldId: string;
  /**
   * value of custom field to update, case version
   */
  request: CustomFieldPutRequest;
}

/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export const replaceCustomField = async (
  { caseId, customFieldId, request }: ReplaceCustomFieldArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CaseCustomField> => {
  const {
    services: { caseService, userActionService },
    user,
    logger,
    authorization,
    config,
  } = clientArgs;

  try {
    const { value, caseVersion } = request;

    decodeWithExcessOrThrow(CustomFieldPutRequestRt)(request);

    const caseToUpdate = await caseService.getCase({
      id: caseId,
    });

    if (caseToUpdate.version !== caseVersion) {
      throw Boom.conflict(
        `This case ${caseToUpdate.id} has been updated. Please refresh before saving additional updates.`
      );
    }

    const configurations = await casesClient.configure.get({
      owner: caseToUpdate.attributes.owner,
    });

    await authorization.ensureAuthorized({
      entities: [{ owner: caseToUpdate.attributes.owner, id: caseToUpdate.id }],
      operation: Operations.updateCase,
    });

    const foundCustomField = configurations[0]?.customFields.find(
      (item) => item.key === customFieldId
    );

    if (!foundCustomField) {
      throw Boom.badRequest('cannot find custom field');
    }

    validateCustomFieldTypesInRequest({
      requestCustomFields: [
        {
          value,
          type: foundCustomField.type,
          key: customFieldId,
        } as CaseCustomField,
      ],
      customFieldsConfiguration: configurations[0].customFields,
    });

    if (value == null && foundCustomField.required) {
      throw Boom.badRequest('Custom field value cannot be null or undefined.');
    }

    const customFieldsToUpdate = [
      {
        value,
        type: foundCustomField.type,
        key: customFieldId,
      },
      ...caseToUpdate.attributes.customFields.filter((field) => field.key !== customFieldId),
    ];

    const decodedCustomFields =
      decodeWithExcessOrThrow(CaseRequestCustomFieldsRt)(customFieldsToUpdate);

    const updatedAt = new Date().toISOString();

    // Mirror customFields into extended_fields so that automations writing to the legacy API
    // keep the v2 analytics / UI surface populated. CustomFields-win semantics: the incoming
    // value always overrides the mirror; a null value clears the mirror key.
    //
    // mergeCustomFieldsIntoExtendedFields returns the *same reference* when the result is
    // value-identical — that signals "no change needed" and we must not spread extended_fields
    // into the patch payload (it would be a spurious write that also triggers an extra user action).
    const existingExtendedFields = caseToUpdate.attributes.extended_fields;
    // Pass only the single field being replaced, not the full reconstructed decodedCustomFields.
    // The reconstructed array includes all stored customFields from the case, and stored-null
    // optional fields would hit the merge's delete branch and wipe unrelated mirror keys.
    const mergedExtendedFields = config.templates.enabled
      ? mergeCustomFieldsIntoExtendedFields(
          [{ key: customFieldId, type: foundCustomField.type, value }],
          existingExtendedFields
        )
      : undefined;
    const extendedFieldsChanged = mergedExtendedFields !== existingExtendedFields;

    const patchCasesPayload = {
      caseId,
      originalCase: caseToUpdate,
      updatedAttributes: {
        customFields: decodedCustomFields,
        ...(extendedFieldsChanged &&
          mergedExtendedFields != null && { extended_fields: mergedExtendedFields }),
        updated_at: updatedAt,
        updated_by: user,
      },
      version: caseVersion,
    };

    const userActionsDict = userActionService.creator.buildUserActions({
      updatedCases: {
        cases: [patchCasesPayload],
      },
      user,
    });

    await validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 });

    const updatedCase = await caseService.patchCase({
      ...patchCasesPayload,
      refresh: false,
    });

    const updatedCustomField = updatedCase.attributes.customFields?.find(
      (cf) => cf.key === customFieldId
    );

    if (!updatedCustomField) {
      throw new Error('Cannot find updated custom field.');
    }

    const builtUserActions =
      userActionsDict != null
        ? Object.keys(userActionsDict).reduce<UserActionEvent[]>((acc, key) => {
            return [...acc, ...userActionsDict[key]];
          }, [])
        : [];

    await userActionService.creator.bulkCreateUpdateCase({
      builtUserActions,
    });

    return decodeOrThrow(CaseCustomFieldRt)(updatedCustomField);
  } catch (error) {
    throw createCaseError({
      message: `Failed to replace customField, id: ${customFieldId} of case: ${caseId} version:${request.caseVersion} : ${error}`,
      error,
      logger,
    });
  }
};
