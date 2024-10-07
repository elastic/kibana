/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { EuiComboBoxProps } from '@elastic/eui/src/components/combo_box/combo_box';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFieldStatsTrigger } from './use_field_stats_trigger';

export const optionCss = css`
  .euiComboBoxOption__enterBadge {
    display: none;
  }
  .euiFlexGroup {
    gap: 0px;
  }
  .euiComboBoxOption__content {
    margin-left: 2px;
  }
`;

/**
 * Props for the EuiComboBoxWithFieldStats component.
 */
export type EuiComboBoxWithFieldStatsProps = EuiComboBoxProps<
  string | number | string[] | undefined
>;

/**
 * React component that wraps the EuiComboBox component and adds field statistics functionality.
 *
 * @component
 * @example
 * ```tsx
 * <EuiComboBoxWithFieldStats options={options} />
 * ```
 * @param {EuiComboBoxWithFieldStatsProps} props - The component props.
 */
export const EuiComboBoxWithFieldStats: FC<EuiComboBoxWithFieldStatsProps> = (props) => {
  const { options, ...restProps } = props;
  const { renderOption } = useFieldStatsTrigger();
  const comboBoxOptions: EuiComboBoxOptionOption[] = useMemo(
    () =>
      Array.isArray(options)
        ? options.map((o) => ({
            ...o,
            css: optionCss,
          }))
        : [],
    [options]
  );

  return (
    <EuiComboBox
      {...restProps}
      options={comboBoxOptions}
      renderOption={renderOption}
      singleSelection={{ asPlainText: true }}
    />
  );
};
