/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { QuickFiltersProps } from './constants';
import { RuleFilter } from './rule_filter';
import { StatusFilter } from './status_filter';
import { TagsFilter } from './tags_filter';

export const QuickFilters = ({ matcher, onChange }: QuickFiltersProps) => {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.label', {
        defaultMessage: 'Quick filters',
      })}
    >
      <EuiFilterGroup data-test-subj="quickFilters">
        <RuleFilter matcher={matcher} onChange={onChange} />
        <StatusFilter matcher={matcher} onChange={onChange} />
        <TagsFilter matcher={matcher} onChange={onChange} />
      </EuiFilterGroup>
    </EuiFormRow>
  );
};
