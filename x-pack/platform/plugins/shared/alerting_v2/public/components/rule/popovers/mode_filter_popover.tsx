/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RULE_KIND_ICONS, RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import type { FilterPopoverOption } from './single_selection_filter_popover';
import { SingleSelectionFilterPopover } from './single_selection_filter_popover';

const MODE_FILTER_OPTIONS: FilterPopoverOption[] = [
  {
    value: 'alert',
    label: RULE_KIND_LABELS.alert,
    iconType: RULE_KIND_ICONS.alert,
  },
  {
    value: 'signal',
    label: RULE_KIND_LABELS.signal,
    iconType: RULE_KIND_ICONS.signal,
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
