/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiCode,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { MappingDateFormatPresetField } from './mapping_date_format_preset_field';

import { TIMESTAMP_FIELD_MAPPING_TYPE_OPTIONS } from './inferred_field_type_options';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import { MappingSubsectionTitle } from './mapping_subsection_title';

const timestampFieldCode = <EuiCode>@timestamp</EuiCode>;

/** Width of the field type control in the index management inline add-field form. */
const MAPPED_FIELDS_TYPE_FIELD_WIDTH_PX = 213;

export interface TimestampFieldMappingSectionProps {
  control: Control<DatasetWizardFormValues>;
  isRequired: boolean;
  format: DatasetFormatFormValue;
  /** When true, omit the spacer meant for placement below other step content. */
  omitLeadingSpacer?: boolean;
}

/** Flow 3 9.6 fixed @timestamp mapping (type, path, format) inside mapped fields. */
export const TimestampFieldMappingSection: FunctionComponent<TimestampFieldMappingSectionProps> = ({
  control,
  isRequired,
  format,
  omitLeadingSpacer = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [fieldType, setFieldType] = useState('date');
  const [fieldFormat, setFieldFormat] = useState('');

  const { field: timeseriesEnabledField } = useController({
    control,
    name: 'timeseries_mapping_enabled',
  });
  const isTimeseriesMappingEnabled = isRequired || timeseriesEnabledField.value !== false;

  const timeseriesMappingEnabled = useWatch({
    control,
    name: 'timeseries_mapping_enabled',
  });

  const { field: fieldPathField, fieldState: fieldPathFieldState } = useController({
    control,
    name: 'timeseries_field_path',
    rules: {
      validate: (value) =>
        isRequired ||
        timeseriesMappingEnabled === false ||
        (typeof value === 'string' && value.trim().length > 0)
          ? true
          : datasetWizardStrings.timeseriesFieldNameRequiredError(),
    },
  });

  const showMappingFields = isRequired || isTimeseriesMappingEnabled;

  const fieldTypeOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<string>> =>
      TIMESTAMP_FIELD_MAPPING_TYPE_OPTIONS.map((type) => ({
        label: datasetWizardStrings.timestampMappingTypeOptionLabel(type),
        value: type,
      })),
    []
  );

  const selectedFieldType = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    const selectedType =
      fieldType === 'date' || fieldType === 'date_nanos' ? fieldType : 'date';

    return [
      {
        label: datasetWizardStrings.timestampMappingTypeOptionLabel(selectedType),
        value: selectedType,
      },
    ];
  }, [fieldType]);

  const typeFieldCss = css`
    flex: 0 0 auto;
    width: ${MAPPED_FIELDS_TYPE_FIELD_WIDTH_PX}px;

    .euiComboBox,
    .euiFormControlLayout {
      width: 100%;
    }
  `;

  const sectionCss = css`
    padding-block-end: ${omitLeadingSpacer ? 0 : euiTheme.size.m};
  `;

  return (
    <>
      {omitLeadingSpacer ? null : <EuiSpacer size="xl" />}
      <div css={sectionCss} data-test-subj="datasetWizardTimestampMappingSection">
        <MappingSubsectionTitle
          title={datasetWizardStrings.timestampMappingSectionTitle()}
          data-test-subj="datasetWizardTimestampMappingSectionTitle"
          trailing={
            isRequired ? (
              <EuiBadge color="danger">{datasetWizardStrings.timestampMappingRequiredBadge()}</EuiBadge>
            ) : (
              <EuiSwitch
                compressed
                label={datasetWizardStrings.timestampMappingEnabledToggle()}
                showLabel={false}
                checked={timeseriesEnabledField.value !== false}
                onChange={(event) => {
                  timeseriesEnabledField.onChange(event.target.checked);
                }}
                data-test-subj="datasetWizardTimestampMappingEnabled"
              />
            )
          }
        />
        <EuiSpacer size="s" />
        <EuiText
          size="s"
          color="subdued"
          data-test-subj="datasetWizardTimestampMappingDescription"
        >
          <p>
            {isRequired ? (
              <FormattedMessage
                id="xpack.dataFederation.datasetWizard.timestampMappingSectionDescriptionRequired"
                defaultMessage="Dynamic mapping is off, so you must map {timestampField} before this dataset can query time-series data."
                values={{ timestampField: timestampFieldCode }}
              />
            ) : isTimeseriesMappingEnabled ? (
              <FormattedMessage
                id="xpack.dataFederation.datasetWizard.timestampMappingSectionDescriptionToggleOn"
                defaultMessage="Mapping {timestampField} is required so queries and dashboards can filter by time."
                values={{ timestampField: timestampFieldCode }}
              />
            ) : (
              <FormattedMessage
                id="xpack.dataFederation.datasetWizard.timestampMappingSectionDescriptionToggleOff"
                defaultMessage="If you have timeseries data, you need to define {timestampField} in order to ensure we process your data correctly."
                values={{ timestampField: timestampFieldCode }}
              />
            )}
          </p>
        </EuiText>
        {showMappingFields ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup
              gutterSize="s"
              alignItems="flexStart"
              data-test-subj="datasetWizardTimestampMappingFields"
            >
              <EuiFlexItem grow={false} css={typeFieldCss}>
                <EuiFormRow
                  label={datasetWizardStrings.timestampMappingTypeLabel()}
                  helpText={<EuiSpacer size="m" />}
                  data-test-subj="datasetWizardTimestampMappingType"
                >
                  <EuiComboBox
                    singleSelection={{ asPlainText: true }}
                    options={fieldTypeOptions}
                    selectedOptions={selectedFieldType}
                    onChange={(nextOptions) => {
                      const nextType = nextOptions[0]?.value;
                      if (nextType) {
                        setFieldType(nextType);
                      }
                    }}
                    isClearable={false}
                    aria-label={datasetWizardStrings.timestampMappingTypeLabel()}
                    inputPopoverProps={{ panelMinWidth: MAPPED_FIELDS_TYPE_FIELD_WIDTH_PX }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={datasetWizardStrings.timestampMappingPathLabel()}
                  helpText={datasetWizardStrings.timestampMappingPathHelp()}
                  fullWidth
                  isInvalid={Boolean(fieldPathFieldState.error)}
                  error={fieldPathFieldState.error?.message}
                  data-test-subj="datasetWizardTimestampMappingPath"
                >
                  <EuiFieldText
                    value={fieldPathField.value ?? ''}
                    onChange={fieldPathField.onChange}
                    onBlur={fieldPathField.onBlur}
                    name={fieldPathField.name}
                    inputRef={fieldPathField.ref}
                    autoComplete="off"
                    fullWidth
                    isInvalid={Boolean(fieldPathFieldState.error)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <MappingDateFormatPresetField
                  value={fieldFormat}
                  onChange={setFieldFormat}
                  format={format}
                  data-test-subj="datasetWizardTimestampMappingFormat"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null}
      </div>
    </>
  );
};
