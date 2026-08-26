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
import {
  validateCustomFieldTypesInRequest,
  validateCaseExtendedFields,
  resolveGlobalFields,
} from './validators';
import type { UserActionEvent } from '../../services/user_actions/types';
import { validateMaxUserActions } from '../../common/validators';
import {
  loadFieldLinkIndexes,
  logUnresolvedMirrorKeys,
  throwIfMalformedFieldLinkage,
} from '../../common/utils/mirror_custom_fields';
import {
  buildActiveLinkMaps,
  incrementPairedWriteCounter,
  pairUpdatedCaseFields,
  throwIfInvalidLinkedFieldValues,
} from '../../common/utils/pair_field_representations';

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
    services: { caseService, userActionService, templatesService, fieldDefinitionsService },
    user,
    logger,
    authorization,
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

    // Pair the replaced customField with its linked extended_fields entry so one
    // case write persists a consistent pair (values go through the reversible
    // per-type codecs — never String(value)). Runs independently of the
    // templates feature flag: once a link exists, live sync must not depend on
    // it (addendum A1).
    //
    // Pass only the single field being replaced, not the full reconstructed
    // decodedCustomFields. The reconstructed array includes all stored
    // customFields from the case, and stored-null optional fields would clear
    // unrelated linked keys the caller never touched.
    //
    // Same-reference results mean "unchanged" — we must not spread
    // extended_fields into the patch payload then (it would be a spurious write
    // that also triggers an extra user action).
    const existingExtendedFields = caseToUpdate.attributes.extended_fields;
    const linkIndexes = await loadFieldLinkIndexes(
      caseToUpdate.attributes.owner,
      fieldDefinitionsService
    );
    const links = buildActiveLinkMaps(configurations[0].customFields, linkIndexes);
    const paired = pairUpdatedCaseFields({
      requestCustomFields: [{ key: customFieldId, type: foundCustomField.type, value }],
      requestExtendedFields: undefined,
      baseCustomFields: decodedCustomFields,
      baseExtendedFields: existingExtendedFields,
      links,
    });
    throwIfMalformedFieldLinkage(paired.malformedFields);
    throwIfInvalidLinkedFieldValues(paired.invalidValues);
    logUnresolvedMirrorKeys(paired.unresolvedKeys, {
      owner: caseToUpdate.attributes.owner,
      logger,
    });
    const extendedFieldsChanged = paired.extendedFields !== existingExtendedFields;
    incrementPairedWriteCounter(clientArgs.usageCounter, paired, extendedFieldsChanged);

    // Definition-aware validation of the FINAL map, matching create.ts/bulk_create.ts/bulk_update.ts:
    // the pairing-derived extended_fields entry must also be a valid key with a valid value
    // against the linked definition. `partial: true` — pairing never makes an absent field
    // "required-missing".
    if (extendedFieldsChanged && paired.extendedFields != null) {
      const globalFields = await resolveGlobalFields(
        caseToUpdate.attributes.owner,
        fieldDefinitionsService
      );
      await validateCaseExtendedFields({
        extendedFields: paired.extendedFields as Record<string, string>,
        templateId: caseToUpdate.attributes.template?.id,
        globalFields,
        templatesService,
        fieldDefinitionsService,
        owner: caseToUpdate.attributes.owner,
        partial: true,
      });
    }

    const patchCasesPayload = {
      caseId,
      originalCase: caseToUpdate,
      ...(Object.keys(paired.pairedKeyToStorageKey).length > 0 && {
        pairedCustomFieldStorageKeys: paired.pairedKeyToStorageKey,
      }),
      updatedAttributes: {
        customFields: decodedCustomFields,
        ...(extendedFieldsChanged &&
          paired.extendedFields != null && {
            extended_fields: paired.extendedFields as Record<string, string>,
          }),
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
