/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import type { MappingEditorValue } from '../components/mapping_editor';

const TIMESTAMP_LOGICAL_FIELD_NAME = '@timestamp';

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

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate(
              'xpack.dataFederation.createDatasetWizard.timeseriesToggleLabel',
              {
                defaultMessage: 'Timeseries data',
              }
            )}
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
              defaultMessage="Mapping {timestampField} is required so queries and dashboards can filter by time."
              values={{ timestampField: <EuiCode>{TIMESTAMP_LOGICAL_FIELD_NAME}</EuiCode> }}
            />
          </>
        ) : (
          <>
            <FormattedMessage
              id="xpack.dataFederation.createDatasetWizard.timeseriesToggleDisabledHelp"
              defaultMessage="If you have timeseries data, you need to define {timestampField} in order to ensure we process your data correctly."
              values={{ timestampField: <EuiCode>{TIMESTAMP_LOGICAL_FIELD_NAME}</EuiCode> }}
            />
          </>
        )}
      </EuiText>

      {isEnabled ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
            <EuiFlexItem>
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
                    { value: 'date', text: 'Date' },
                    { value: 'date_nanos', text: 'Date nanos' },
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
                    defaultMessage: 'Format (optional)',
                  }
                )}
                helpText={
                  <>
                    <EuiCode>ISO-8601</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
                  </>
                }
                fullWidth
              >
                <EuiFieldText
                  fullWidth
                  placeholder={i18n.translate(
                    'xpack.dataFederation.createDatasetWizard.timestampFieldFormatPlaceholder',
                    { defaultMessage: 'Select or enter a format' }
                  )}
                  value={timestampField?.format ?? ''}
                  onChange={(e) => onChangeTimestampField({ format: e.target.value })}
                  data-test-subj="createDatasetWizardTimestampFormat"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
}
