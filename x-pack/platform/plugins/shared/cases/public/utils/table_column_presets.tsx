/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import type { ColumnPreset } from '@kbn/shared-ux-column-presets';
import { getEmptyCellValue } from '../components/empty_value';
import { SeverityHealth } from '../components/severity/config';
import { type CaseSeverity } from '../../common/types/domain';
import { FormattedRelativePreferenceDate } from '../components/formatted_date';

/**
 * @internal
 */
export const tableColumnPresetSeverity: ColumnPreset<{
  renderProps?: Partial<ComponentProps<typeof SeverityHealth>>;
}> = ({ renderProps = {} }) => ({
  width: '6em', // The longest severity string is "critical"
  minWidth: '6em',
  className: 'eui-textNoWrap',
  render: (value: CaseSeverity) => {
    if (value == null) {
      return getEmptyCellValue();
    }

    return <SeverityHealth {...renderProps} severity={value} />;
  },
});

/**
 * @internal
 */
export const tableColumnPresetDateRelative: ColumnPreset<{ stripMs: boolean }> = ({ stripMs }) => ({
  width: stripMs ? '9em' : '9.5em',
  minWidth: stripMs ? '9em' : '9.5em',
  render: (value: string | number | null) => {
    if (value == null) {
      return getEmptyCellValue();
    }

    return <FormattedRelativePreferenceDate value={value} stripMs={stripMs} />;
  },
});
