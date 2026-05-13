/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption, EuiSelectOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsProps } from '../types';
import { useGetFields } from './use_get_fields';

import * as i18n from './translations';
import { generateJSONValidator } from '../validate_json';
import { AdditionalFormFields } from './additional_form_fields';

const ResilientFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = ({
  connector,
  isInSidebarForm,
}) => {
  const { http } = useKibana().services;

  const {
    isLoading: isLoadingFields,
    isFetching: isFetchingFields,
    data: fieldsData,
  } = useGetFields({
    http,
    connector,
  });

  const allIncidentTypes = useMemo<EuiComboBoxOptionOption<string>[]>(() => {
    const incidentTypesField = fieldsData?.data?.fieldsObj.incident_type_ids;
    if (incidentTypesField == null || !Array.isArray(incidentTypesField.values)) {
      return [];
    }
    return incidentTypesField.values.map((choice) => ({
      id: choice.value.toString(),
      label: choice.label,
    }));
  }, [fieldsData]);

  const severity = useMemo<EuiSelectOption[]>(() => {
    const severityField = fieldsData?.data?.fieldsObj.severity_code;
    if (severityField == null || !Array.isArray(severityField.values)) {
      return [];
    }
    return severityField.values.map((choice) => ({
      value: choice.value.toString(),
      text: choice.label,
    }));
  }, [fieldsData]);

  const isLoading = isLoadingFields || isFetchingFields;

  const additionalFieldsProps = useMemo(() => {
    return {
      componentProps: { connector, isInSidebarForm },
      config: {
        defaultValue: '',
        validations: [
          {
            validator: generateJSONValidator({ maxAdditionalFields: 50 }),
          },
        ],
      },
    };
  }, [connector, isInSidebarForm]);

  return (
    <span data-test-subj={'connector-fields-resilient'}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField<string[]> path="fields.incidentTypes" config={{ defaultValue: [] }}>
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

              const onChangeComboBox = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
                field.setValue(changedOptions.map((option) => option.id as string));
              };

              const selectedOptions =
                field.value && allIncidentTypes?.length
                  ? field.value.map((incidentType) => {
                      const matchedOption = allIncidentTypes.find(
                        (option) => option.id === incidentType
                      );
                      return matchedOption ?? { label: incidentType, id: incidentType };
                    })
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
                    isInvalid={isInvalid}
                    data-test-subj="incidentTypeComboBox"
                    fullWidth
                    isClearable={true}
                    isDisabled={isLoading}
                    isLoading={isLoading}
                    onChange={onChangeComboBox}
                    options={allIncidentTypes}
                    placeholder={i18n.INCIDENT_TYPES_PLACEHOLDER}
                    selectedOptions={selectedOptions}
                  />
                </EuiFormRow>
              );
            }}
          </UseField>
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="fields.severityCode"
            component={SelectField}
            config={{
              label: i18n.SEVERITY_LABEL,
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'severitySelect',
                options: severity,
                hasNoInitialSelection: true,
                fullWidth: true,
                disabled: isLoading,
                isLoading,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            path="fields.additionalFields"
            config={additionalFieldsProps.config}
            component={AdditionalFormFields}
            componentProps={additionalFieldsProps.componentProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </span>
  );
};

ResilientFieldsComponent.displayName = 'ResilientFields';
// eslint-disable-next-line import/no-default-export
export { ResilientFieldsComponent as default };
