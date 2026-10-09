/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { MappingEditorValue } from './mapping_editor';
import { DatetimeFormatComboBox } from '../components/datetime_format_combo_box';
import { DatetimeFormatHelpText } from '../components/datetime_format_help_text';
import { TIMESTAMP_LOGICAL_FIELD_NAME } from '../constants';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { fieldTypeSelectStrings } from './mapping_editor/field_type_select_i18n';
import {
  fieldRowContainerStyles,
  getRemainingFieldsGridStyles,
  getRemainingFieldsGroupItemStyles,
  getTypeFieldItemStyles,
} from './field_row_layout';

const REMAINING_FIELD_COUNT = 2;

export interface TimeseriesDataSectionProps {
  isEnabled: boolean;
  shouldShowValidation: boolean;
  timestampField?: MappingEditorValue['fields'][number];
  onToggle: (checked: boolean) => void;
  onChangeTimestampField: (patch: Partial<MappingEditorValue['fields'][number]>) => void;
}

export function TimeseriesDataSection({
  isEnabled,
  shouldShowValidation,
  timestampField,
  onToggle,
  onChangeTimestampField,
}: TimeseriesDataSectionProps) {
  const isTimestampPathMissing =
    shouldShowValidation && isEnabled && (timestampField?.path ?? '').trim() === '';
  const { euiTheme } = useEuiTheme();
  const gutter = euiTheme.size.base;
  // The field mapping editor pads its form on both sides; matching it keeps both rows switching
  // layouts at the same viewport width.
  const inset = `calc(${euiTheme.size.s} * 2)`;
  const typeFieldItemStyles = useMemo(
    () => getTypeFieldItemStyles(REMAINING_FIELD_COUNT, gutter, inset),
    [gutter, inset]
  );
  const remainingFieldsGroupStyles = useMemo(
    () => getRemainingFieldsGroupItemStyles(REMAINING_FIELD_COUNT, gutter, inset),
    [gutter, inset]
  );
  const remainingFieldsGridStyles = useMemo(
    () => getRemainingFieldsGridStyles(REMAINING_FIELD_COUNT, gutter, inset),
    [gutter, inset]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{createDatasetWizardStrings.timeseriesDataLabel}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            showLabel={false}
            label={createDatasetWizardStrings.timeseriesDataLabel}
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            data-test-subj="createDatasetWizardTimeseriesToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {isEnabled ? (
          <>
            <FormattedMessage
              id="xpack.dataFederation.createDatasetWizard.timeseriesToggleEnabledHelp"
              defaultMessage="Choose the date field to map to {timestampField}."
              values={{ timestampField: <EuiCode>{TIMESTAMP_LOGICAL_FIELD_NAME}</EuiCode> }}
            />
          </>
        ) : (
          <>
            <FormattedMessage
              id="xpack.dataFederation.createDatasetWizard.timeseriesToggleDisabledHelp"
              defaultMessage="Queries and dashboards can't filter by time without a field mapped to {timestampField}."
              values={{ timestampField: <EuiCode>{TIMESTAMP_LOGICAL_FIELD_NAME}</EuiCode> }}
            />
          </>
        )}
      </EuiText>

      {isEnabled ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="m"
            alignItems="flexStart"
            responsive={false}
            wrap
            css={fieldRowContainerStyles}
          >
            <EuiFlexItem css={typeFieldItemStyles}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.dataFederation.createDatasetWizard.timestampFieldTypeLabel',
                  {
                    defaultMessage: 'Field type',
                  }
                )}
                fullWidth
              >
                <EuiSelect
                  fullWidth
                  value={timestampField?.type ?? 'date'}
                  options={[
                    { value: 'date', text: fieldTypeSelectStrings.dateOption },
                    { value: 'date_nanos', text: fieldTypeSelectStrings.dateNanosOption },
                  ]}
                  onChange={(e) =>
                    onChangeTimestampField({
                      type: e.target.value as 'date' | 'date_nanos',
                    })
                  }
                  data-test-subj="createDatasetWizardTimestampType"
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem css={remainingFieldsGroupStyles}>
              <div css={remainingFieldsGridStyles}>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.dataFederation.createDatasetWizard.timestampFieldPathLabel',
                      {
                        defaultMessage: 'Field name',
                      }
                    )}
                    helpText={i18n.translate(
                      'xpack.dataFederation.createDatasetWizard.timestampFieldPathHelp',
                      {
                        defaultMessage: 'Source column or JSON path.',
                      }
                    )}
                    isInvalid={isTimestampPathMissing}
                    error={
                      isTimestampPathMissing
                        ? i18n.translate(
                            'xpack.dataFederation.createDatasetWizard.timestampFieldPathRequired',
                            { defaultMessage: 'Field name is required.' }
                          )
                        : undefined
                    }
                    fullWidth
                  >
                    <EuiFieldText
                      isInvalid={isTimestampPathMissing}
                      fullWidth
                      value={timestampField?.path ?? ''}
                      onChange={(e) => onChangeTimestampField({ path: e.target.value })}
                      data-test-subj="createDatasetWizardTimestampPath"
                    />
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.dataFederation.createDatasetWizard.timestampFieldFormatLabel',
                      {
                        defaultMessage: 'Date and time format (optional)',
                      }
                    )}
                    helpText={<DatetimeFormatHelpText />}
                    fullWidth
                  >
                    <DatetimeFormatComboBox
                      value={timestampField?.format ?? ''}
                      onChange={(next: string) => onChangeTimestampField({ format: next })}
                      onBlur={() => {}}
                      placeholder={i18n.translate(
                        'xpack.dataFederation.createDatasetWizard.timestampFieldFormatPlaceholder',
                        { defaultMessage: 'yyyy-MM-dd HH:mm:ss' }
                      )}
                      data-test-subj="createDatasetWizardTimestampFormat"
                      aria-label={i18n.translate(
                        'xpack.dataFederation.createDatasetWizard.timestampFieldFormatAriaLabel',
                        { defaultMessage: 'Select or enter a format' }
                      )}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
}
