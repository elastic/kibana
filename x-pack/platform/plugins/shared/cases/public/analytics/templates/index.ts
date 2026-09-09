/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerTemplateManagementEvents } from './register_management_events';

/**
 * Registers every browser event for the templates feature.
 *
 * The templates feature has more than one event family, and each family owns its own register module
 * plus its own reporter hooks: managing the templates themselves lives in
 * `register_management_events`, and applying a template to a case will live beside it. Composing them
 * here means `public/analytics/index.ts` keeps a single import and a single call however many
 * families are added, so add each new family's register function to this function rather than to the
 * parent module.
 */
export const registerTemplateAnalytics = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  registerTemplateManagementEvents({ analyticsService });
};

export {
  useTemplateCreatedEBT,
  useTemplateDeletedEBT,
  useTemplateUpdatedEBT,
} from './use_template_management_ebt';
export type {
  TemplateCreationMode,
  TemplateDeleteEntryPoint,
  TemplateDeleteScope,
  TemplateEntryPoint,
} from './use_template_management_ebt';
