/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleCreateSearchSectionId } from './types';

/** Sections in the order they are rendered in the dropdown. */
export const RULE_CREATE_SEARCH_SECTION_IDS = ['universal', 'universal.templates', 'classic'] as const;

export const MAX_RESULTS_PER_SECTION = 10;

export const RULE_CREATE_SEARCH_SECTION_TITLES: Readonly<
  Record<RuleCreateSearchSectionId, string>
> = {
  universal: i18n.translate('xpack.alertingV2.ruleCreateSearch.section.universalTitle', {
    defaultMessage: 'Universal',
  }),
  'universal.templates': i18n.translate('xpack.alertingV2.ruleCreateSearch.section.templatesTitle', {
    defaultMessage: 'From templates',
  }),
  classic: i18n.translate('xpack.alertingV2.ruleCreateSearch.section.classicTitle', {
    defaultMessage: 'Classic rule types',
  }),
};
