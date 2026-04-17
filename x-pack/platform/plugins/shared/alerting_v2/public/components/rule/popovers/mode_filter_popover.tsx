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

const MODE_FILTER_OPTIONS: FilterPopoverOption[] = [
  {
    value: 'alert',
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.alert', {
      defaultMessage: 'Alerting',
    }),
    iconType: 'bell',
  },
  {
    value: 'signal',
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.signal', {
      defaultMessage: 'Detect only',
    }),
    iconType: 'radar',
  },
];

export const ModeFilterPopover = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <SingleSelectionFilterPopover
    label={i18n.translate('xpack.alertingV2.rulesList.modeFilter.label', {
      defaultMessage: 'Mode',
    })}
    options={MODE_FILTER_OPTIONS}
    dataTestSubj="rulesListModeFilter"
    popoverLabel={i18n.translate('xpack.alertingV2.rulesList.modeFilter.popoverLabel', {
      defaultMessage: 'Mode filter options',
    })}
    ariaLabel={i18n.translate('xpack.alertingV2.rulesList.modeFilter.ariaLabel', {
      defaultMessage: 'Filter rules by mode',
    })}
    value={value}
    onChange={onChange}
  />
);
