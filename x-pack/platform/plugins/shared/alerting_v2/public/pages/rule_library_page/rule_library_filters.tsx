/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TAG_FILTER_ID, type FieldDefinition } from '@kbn/content-list-provider';
import { createTagsFilter } from '../../components/create_tags_filter';
import { useFetchRuleTemplateTags } from '../../hooks/use_fetch_rule_template_tags';

export const RuleTemplateTagsFilter = createTagsFilter({
  useFetchTags: useFetchRuleTemplateTags,
  testSubjectPrefix: 'ruleLibraryTagsFilter',
});

export const RULE_LIBRARY_FEATURES_FIELDS: FieldDefinition[] = [
  {
    fieldName: TAG_FILTER_ID,
    resolveIdToDisplay: (id) => id,
    resolveDisplayToId: (displayValue) => displayValue,
  },
];
