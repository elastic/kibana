/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption, EuiSelectOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';

import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsProps } from '../types';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';

import * as i18n from './translations';

const ResilientFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = ({ connector }) => {
  const { http } = useKibana().services;

  const {
    isLoading: isLoadingIncidentTypesData,
    isFetching: isFetchingIncidentTypesData,
    data: allIncidentTypesData,
  } = useGetIncidentTypes({
    http,
    connector,
  });

  const {
    isLoading: isLoadingSeverityData,
    isFetching: isFetchingSeverityData,
    data: severityData,
  } = useGetSeverity({
    http,
    connector,
  });

  const allIncidentTypes = allIncidentTypesData?.data;
  const severity = severityData?.data;
  const isLoadingIncidentTypes = isLoadingIncidentTypesData || isFetchingIncidentTypesData;
  const isLoadingSeverity = isLoadingSeverityData || isFetchingSeverityData;

  const severitySelectOptions: EuiSelectOption[] = useMemo(
    () =>
      (severity ?? []).map((s) => ({
        value: s.id.toString(),
        text: s.name,
      })),
    [severity]
  );

  const incidentTypesComboBoxOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      allIncidentTypes
        ? allIncidentTypes.map((type: { id: number; name: string }) => ({
            label: type.name,
            value: type.id.toString(),
          }))
        : [],
    [allIncidentTypes]
  );

  return (
    <span data-test-subj={'connector-fields-resilient'}>
      <UseField<string[]> path="fields.incidentTypes" config={{ defaultValue: [] }}>
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

          const onChangeComboBox = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
            field.setValue(changedOptions.map((option) => option.value as string));
          };

          const selectedOptions =
            field.value && allIncidentTypes?.length
              ? field.value.map((incidentType) => ({
                  value: incidentType,
                  label:
                    allIncidentTypes.find((type) => incidentType === type.id.toString())?.name ??
                    '',
                }))
              : [];

          return (
            <EuiFormRow
              id="indexConnectorSelectSearchBox"
              fullWidth
              label={i18n.INCIDENT_TYPES_LABEL}
              isInvalid={isInvalid}
              error={errorMessage}
            >
              <EuiComboBox
                data-test-subj="incidentTypeComboBox"
                fullWidth
                isClearable={true}
                isDisabled={isLoadingIncidentTypes}
                isLoading={isLoadingIncidentTypes}
                onChange={onChangeComboBox}
                options={incidentTypesComboBoxOptions}
                placeholder={i18n.INCIDENT_TYPES_PLACEHOLDER}
                selectedOptions={selectedOptions}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <EuiSpacer size="m" />
      <UseField
        path="fields.severityCode"
        component={SelectField}
        config={{
          label: i18n.SEVERITY_LABEL,
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'severitySelect',
            options: severitySelectOptions,
            hasNoInitialSelection: true,
            fullWidth: true,
            disabled: isLoadingSeverity,
            isLoading: isLoadingSeverity,
          },
        }}
      />
      <EuiSpacer size="m" />
    </span>
  );
};

ResilientFieldsComponent.displayName = 'ResilientFields';
// eslint-disable-next-line import/no-default-export
export { ResilientFieldsComponent as default };
