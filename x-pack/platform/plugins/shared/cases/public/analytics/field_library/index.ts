/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerFieldLibraryManagementEvents } from './register_management_events';

/**
 * Registers every browser event for the Field Library feature.
 *
 * Managing the field definitions themselves is the only event family today. Composing the families
 * here means `public/analytics/index.ts` keeps a single import and a single call however many are
 * added, so add each new family's register function to this function rather than to the parent
 * module.
 */
export const registerFieldLibraryAnalytics = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  registerFieldLibraryManagementEvents({ analyticsService });
};

export {
  useFieldDefinitionCreatedEBT,
  useFieldDefinitionDeletedEBT,
  useFieldDefinitionUpdatedEBT,
} from './use_field_definition_management_ebt';
