/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../app_context';

export function getSpaceAwareSaveobjectsClients(spaceId?: string) {
  // Saved object client need to be scopped with the package space for saved object tagging
  const savedObjectClientWithSpace = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  const savedObjectsImporter = appContextService
    .getSavedObjects()
    .createImporter(savedObjectClientWithSpace, { importSizeLimit: 15_000 });

  const savedObjectTagAssignmentService = appContextService
    .getSavedObjectsTagging()
    .createInternalAssignmentService({ client: savedObjectClientWithSpace });

  const savedObjectTagClient = appContextService
    .getSavedObjectsTagging()
    .createTagClient({ client: savedObjectClientWithSpace });

  return {
    savedObjectClientWithSpace,
    savedObjectsImporter,
    savedObjectTagAssignmentService,
    savedObjectTagClient,
  };
}
