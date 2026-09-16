/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormSectionSummary } from './form_section_summary';

export const buildScopeFormula = (tags: string[], matchExpression: string | null): string => {
  const hasTags = tags.length > 0;
  const hasMatcher = Boolean(matchExpression?.trim());

  if (!hasTags && !hasMatcher) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.scope.allEpisodes', {
      defaultMessage: 'all alerts v2 in this space',
    });
  }

  if (hasTags && hasMatcher) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.scope.tagsAndExpression', {
      defaultMessage:
        'all rules with one or multiple of the selected tags and the expression conditions',
    });
  }

  if (hasTags) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.scope.selectedTags', {
      defaultMessage: 'all rules with one or multiple of the selected tags',
    });
  }

  return i18n.translate('xpack.alertingV2.actionPolicy.form.scope.expressionOnly', {
    defaultMessage: 'all episodes that meet the expression conditions',
  });
};

interface PolicyScopeSummaryProps {
  selectedTags: string[];
  matcher: string;
}

export const PolicyScopeSummary = ({ selectedTags, matcher }: PolicyScopeSummaryProps) => (
  <FormSectionSummary
    title={i18n.translate('xpack.alertingV2.actionPolicy.form.scope.appliesTo', {
      defaultMessage: 'Applies to',
    })}
    inline
    data-test-subj="policyScopeSummary"
    textTestSubj="policyScopeSummaryText"
  >
    {buildScopeFormula(selectedTags, matcher || null)}
  </FormSectionSummary>
);
