/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  Logger,
  SavedObject,
  SavedObjectsExportTransformContext,
} from '@kbn/core/server';
import type {
  CaseUserActionWithoutReferenceIds,
  AttachmentAttributesWithoutRefs,
} from '../../../common/types/domain';
import type { AttachmentAttributesV2 } from '../../../common/types/domain/attachment/v2';
import type { Template } from '../../../common/types/domain/template/latest';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { createCaseError } from '../../common/error';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { ConfigType } from '../../config';
import {
  getAttachmentsAndUserActionsForCases,
  getTemplatesAndFieldDefinitionsForCases,
} from './utils';
import { getSavedObjectsTypes } from '../../../common';
import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
} from '../../../common/constants';

export async function handleExport({
  context,
  objects,
  coreSetup,
  logger,
  config,
}: {
  context: SavedObjectsExportTransformContext;
  objects: Array<SavedObject<CasePersistedAttributes>>;
  coreSetup: CoreSetup;
  logger: Logger;
  config: ConfigType;
}): Promise<
  Array<
    SavedObject<
      | CasePersistedAttributes
      | AttachmentAttributesWithoutRefs
      | AttachmentAttributesV2
      | CaseUserActionWithoutReferenceIds
      | Template
      | FieldDefinition
    >
  >
> {
  try {
    if (objects.length <= 0) {
      return [];
    }

    const cleanedObjects: Array<SavedObject<CasePersistedAttributes>> = objects.map((obj) => ({
      ...obj,
      attributes: {
        ...obj.attributes,
        incremental_id: undefined,
      },
    }));

    const [{ savedObjects }] = await coreSetup.getStartServices();
    // Include both new template SO types unconditionally — they are always registered and their
    // importableAndExportable flag is static, so bundling must not depend on the feature flag.
    // This mirrors how cases-attachments is always included regardless of xpack.cases.attachments.enabled.
    const includedHiddenTypes = [
      ...new Set([
        ...getSavedObjectsTypes(config),
        CASE_TEMPLATE_SAVED_OBJECT,
        CASE_FIELD_DEFINITION_SAVED_OBJECT,
      ]),
    ];
    const savedObjectsClient = savedObjects.getScopedClient(context.request, {
      includedHiddenTypes,
    });

    const caseIds = cleanedObjects.map((caseObject) => caseObject.id);
    const [attachmentsAndUserActionsForCases, templatesAndFieldDefinitions] = await Promise.all([
      getAttachmentsAndUserActionsForCases(savedObjectsClient, caseIds),
      getTemplatesAndFieldDefinitionsForCases(savedObjectsClient, cleanedObjects, logger),
    ]);

    return [
      ...cleanedObjects,
      ...attachmentsAndUserActionsForCases,
      ...templatesAndFieldDefinitions,
    ];
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve associated objects for exporting of cases: ${error}`,
      error,
      logger,
    });
  }
}
