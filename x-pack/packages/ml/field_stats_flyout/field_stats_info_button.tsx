/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { type FC } from 'react';
import { FieldIcon } from '@kbn/react-field';
import { type Field } from '@kbn/ml-anomaly-utils';
import { useCurrentEuiThemeVars } from '@kbn/ml-kibana-theme';
import { useFieldStatsFlyoutThemeVars } from './use_field_stats_flyout_context';

import { getKbnFieldIconType } from './get_kbn_field_icon_types';

/**
 * Represents a field used for statistics.
 */
export type FieldForStats = Pick<Field, 'id' | 'type'>;

/**
 * Represents the props for the FieldStatsInfoButton component.
 */
export interface FieldStatsInfoButtonProps {
  /**
   * The field for which to display statistics.
   */
  field: FieldForStats;
  /**
   * The label for the field.
   */
  label: string;
  /**
   * Button click callback function.
   * @param field - The field for which to display statistics.
   * @returns void
   */
  onButtonClick?: (field: FieldForStats) => void;
  /**
   * If true, the button is disabled.
   */
  disabled?: boolean;
  /**
   * If true, the field is empty.
   */
  isEmpty?: boolean;
  /**
   * If true, the trigger is hidden.
   */
  hideTrigger?: boolean;
}

/**
 * Renders a button component for field statistics information.
 *
 * @component
 * @example
 * ```tsx
 * <FieldStatsInfoButton
 *   field={field}
 *   label={label}
 *   onButtonClick={handleButtonClick}
 *   disabled={false}
 *   isEmpty={true}
 *   hideTrigger={false}
 * />
 * ```
 * @param {FieldStatsInfoButtonProps} props - The props for the FieldStatsInfoButton component.
 */
export const FieldStatsInfoButton: FC<FieldStatsInfoButtonProps> = (props) => {
  const { field, label, onButtonClick, disabled, isEmpty, hideTrigger } = props;
  const theme = useFieldStatsFlyoutThemeVars();
  const themeVars = useCurrentEuiThemeVars(theme);

  const emptyFieldMessage = isEmpty
    ? ' ' +
      i18n.translate('xpack.ml.newJob.wizard.fieldContextPopover.emptyFieldInSampleDocsMsg', {
        defaultMessage: '(no data found in 1000 sample records)',
      })
    : '';

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        {!hideTrigger ? (
          <EuiToolTip
            content={
              i18n.translate(
                'xpack.ml.newJob.wizard.fieldContextPopover.inspectFieldStatsTooltip',
                {
                  defaultMessage: 'Inspect field statistics',
                }
              ) + emptyFieldMessage
            }
          >
            <EuiButtonIcon
              data-test-subj={`mlInspectFieldStatsButton-${field.id}`}
              disabled={disabled === true}
              size="xs"
              iconType="fieldStatistics"
              css={{ color: isEmpty ? themeVars.euiTheme.euiColorDisabled : undefined }}
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                if (ev.type === 'click') {
                  ev.currentTarget.focus();
                }
                ev.preventDefault();
                ev.stopPropagation();

                if (onButtonClick) {
                  onButtonClick(field);
                }
              }}
              aria-label={
                i18n.translate(
                  'xpack.ml.newJob.wizard.fieldContextPopover.inspectFieldStatsTooltipAriaLabel',
                  {
                    defaultMessage: 'Inspect field statistics',
                  }
                ) + emptyFieldMessage
              }
            />
          </EuiToolTip>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={{
          paddingRight: themeVars.euiTheme.euiSizeXS,
        }}
      >
        {!hideTrigger ? (
          <FieldIcon
            color={isEmpty ? themeVars.euiTheme.euiColorDisabled : undefined}
            type={getKbnFieldIconType(field.type)}
            fill="none"
          />
        ) : null}
      </EuiFlexItem>
      <EuiText
        color={isEmpty ? 'subdued' : undefined}
        size="s"
        aria-label={label}
        title={label}
        className="euiComboBoxOption__content"
      >
        {label}
      </EuiText>
    </EuiFlexGroup>
  );
};
