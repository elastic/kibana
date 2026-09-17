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
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { TIMESTAMP_FIELD_MAPPING_TYPE_OPTIONS } from './inferred_field_type_options';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import { MappingSubsectionTitle } from './mapping_subsection_title';

const timestampFieldCode = <EuiCode>@timestamp</EuiCode>;

/** Width of the field type control in the index management inline add-field form. */
const MAPPED_FIELDS_TYPE_FIELD_WIDTH_PX = 213;

export interface TimestampFieldMappingSectionProps {
  isRequired: boolean;
}

const TimestampRequirementBadge: FunctionComponent<{ isRequired: boolean }> = ({ isRequired }) =>
  isRequired ? (
    <EuiBadge color="danger">{datasetWizardStrings.timestampMappingRequiredBadge()}</EuiBadge>
  ) : (
    <EuiBadge color="hollow">{datasetWizardStrings.timestampMappingRecommendedBadge()}</EuiBadge>
  );

/** Flow 3 9.6 fixed @timestamp mapping (type, path, format) inside mapped fields. */
export const TimestampFieldMappingSection: FunctionComponent<TimestampFieldMappingSectionProps> = ({
  isRequired,
}) => {
  const { euiTheme } = useEuiTheme();
  const [fieldType, setFieldType] = useState('date');
  const [fieldPath, setFieldPath] = useState('');
  const [fieldFormat, setFieldFormat] = useState('');

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
    padding-block-end: ${euiTheme.size.m};
  `;

  return (
    <>
      <EuiSpacer size="xl" />
      <div css={sectionCss} data-test-subj="datasetWizardTimestampMappingSection">
        <MappingSubsectionTitle
          title={datasetWizardStrings.timestampMappingSectionTitle()}
          data-test-subj="datasetWizardTimestampMappingSectionTitle"
          trailing={<TimestampRequirementBadge isRequired={isRequired} />}
        />
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {isRequired ? (
              <FormattedMessage
                id="xpack.dataFederation.datasetWizard.timestampMappingSectionDescriptionRequired"
                defaultMessage="Dynamic mapping is off, so you must map {timestampField} before this dataset can query time-series data."
                values={{ timestampField: timestampFieldCode }}
              />
            ) : (
              <FormattedMessage
                id="xpack.dataFederation.datasetWizard.timestampMappingSectionDescriptionRecommended"
                defaultMessage="Mapping {timestampField} is recommended so queries and dashboards can filter by time."
                values={{ timestampField: timestampFieldCode }}
              />
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" data-test-subj="datasetWizardTimestampMappingFields">
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
              data-test-subj="datasetWizardTimestampMappingPath"
            >
              <EuiFieldText
                value={fieldPath}
                onChange={(event) => setFieldPath(event.target.value)}
                placeholder={datasetWizardStrings.timestampMappingPathPlaceholder()}
                autoComplete="off"
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={datasetWizardStrings.timestampMappingFormatLabel()}
              helpText={datasetWizardStrings.timestampMappingFormatHelp()}
              fullWidth
              data-test-subj="datasetWizardTimestampMappingFormat"
            >
              <EuiFieldText
                value={fieldFormat}
                onChange={(event) => setFieldFormat(event.target.value)}
                placeholder={datasetWizardStrings.timestampMappingFormatPlaceholder()}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
