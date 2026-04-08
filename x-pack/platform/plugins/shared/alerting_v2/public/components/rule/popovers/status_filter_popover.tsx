/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { FilterPopoverOption } from './single_selection_filter_popover';
import { SingleSelectionFilterPopover } from './single_selection_filter_popover';

const STATUS_FILTER_OPTIONS: FilterPopoverOption[] = [
  {
    value: 'true',
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.enabled', {
      defaultMessage: 'Enabled',
    }),
  },
  {
    value: 'false',
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.disabled', {
      defaultMessage: 'Disabled',
    }),
  },
];

export const StatusFilterPopover = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <SingleSelectionFilterPopover
    label={i18n.translate('xpack.alertingV2.rulesList.statusFilter.label', {
      defaultMessage: 'Status',
    })}
    options={STATUS_FILTER_OPTIONS}
    dataTestSubj="rulesListStatusFilter"
    popoverLabel={i18n.translate('xpack.alertingV2.rulesList.statusFilter.popoverLabel', {
      defaultMessage: 'Status filter options',
    })}
    ariaLabel={i18n.translate('xpack.alertingV2.rulesList.statusFilter.ariaLabel', {
      defaultMessage: 'Filter rules by status',
    })}
    buttonWidth={140}
    value={value}
    onChange={onChange}
  />
);
