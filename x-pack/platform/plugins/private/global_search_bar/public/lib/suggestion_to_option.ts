/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import { SearchSuggestion } from '../suggestions';

export const suggestionToOption = (
  suggestion: SearchSuggestion
): EuiSelectableTemplateSitewideOption => {
  const { key, label, description, icon, suggestedSearch } = suggestion;
  return {
    key,
    label,
    type: '__suggestion__',
    icon: { type: icon },
    suggestion: suggestedSearch,
    meta: [{ text: description }],
    'data-test-subj': `nav-search-option`,
  };
};
