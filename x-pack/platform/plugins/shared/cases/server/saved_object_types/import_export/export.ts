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
import { SAVED_OBJECT_TYPES } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import type { CasePersistedAttributes } from '../../common/types/case';
import { getAttachmentsAndUserActionsForCases } from './utils';

export async function handleExport({
  context,
  objects,
  coreSetup,
  logger,
}: {
  context: SavedObjectsExportTransformContext;
  objects: Array<SavedObject<CasePersistedAttributes>>;
  coreSetup: CoreSetup;
  logger: Logger;
}): Promise<
  Array<
    SavedObject<
      CasePersistedAttributes | AttachmentAttributesWithoutRefs | CaseUserActionWithoutReferenceIds
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
    const savedObjectsClient = savedObjects.getScopedClient(context.request, {
      includedHiddenTypes: SAVED_OBJECT_TYPES,
    });

    const caseIds = cleanedObjects.map((caseObject) => caseObject.id);
    const attachmentsAndUserActionsForCases = await getAttachmentsAndUserActionsForCases(
      savedObjectsClient,
      caseIds
    );

    return [...cleanedObjects, ...attachmentsAndUserActionsForCases.flat()];
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve associated objects for exporting of cases: ${error}`,
      error,
      logger,
    });
  }
}
