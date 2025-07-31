/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { scheduledReportMappings, scheduledReportModelVersions } from './scheduled_report';

export const SCHEDULED_REPORT_SAVED_OBJECT_TYPE = 'scheduled_report';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple',
    mappings: scheduledReportMappings,
    management: { importableAndExportable: false },
    modelVersions: scheduledReportModelVersions,
  });
}
