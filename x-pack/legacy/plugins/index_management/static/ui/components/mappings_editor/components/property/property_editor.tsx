/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';

import {
  useForm,
  UseField,
  Form,
  FormDataProvider,
  FieldConfig,
  ValidationConfig,
} from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { nameConflictError } from '../../errors';
import {
  parametersDefinition,
  dataTypesDefinition,
  getTypeFromSubType,
  ParameterName,
  DataType,
  SubType,
} from '../../config';
import { PropertyBasicParameters } from './property_basic_parameters';
import { getComponentForParameter } from '../parameters';
import { getAdvancedSettingsCompForType } from '../advanced_settings';

interface Props {
  onSubmit: (property: Record<string, any>) => void;
  onCancel: () => void;
  defaultValue?: Record<string, any>;
  parentObject: Record<string, any>;
  [key: string]: any;
}

// We need to dynamically add the "uniqueNameValidation" as it validates
// that the field name value provided does not already exist on the parent object.
const updateNameParameterValidations = (
  fieldConfig: FieldConfig,
  parentObject: Record<string, any>,
  initialValue = ''
): ValidationConfig[] => {
  const uniqueNameValidation: ValidationConfig['validator'] = ({ value }) => {
    if (Object.keys(parentObject).some(key => key !== initialValue && key === value)) {
      return nameConflictError();
    }
  };
  return [...fieldConfig.validations!, { validator: uniqueNameValidation }];
};

const getFieldConfig = (param: ParameterName): FieldConfig =>
  parametersDefinition[param].fieldConfig || {};

const defaultValueParam = (param: ParameterName): unknown =>
  typeof getFieldConfig(param).defaultValue !== 'undefined'
    ? getFieldConfig(param).defaultValue
    : '';

const sanitizePropParameters = (parameters: Record<string, any>): Record<string, any> =>
  Object.entries(parameters).reduce(
    (acc, [param, value]) => {
      // IF a prop value is "index_default", we remove it
      if (value !== 'index_default') {
        acc[param] = value;
      }
      return acc;
    },
    {} as any
  );

const serializer = (property: Record<string, any>) => {
  // If a subType is present, use it as type for ES
  if ({}.hasOwnProperty.call(property, 'subType')) {
    property.type = property.subType;
    delete property.subType;
  }
  return sanitizePropParameters(property);
};

const deserializer = (property: Record<string, any>) => {
  if (!(dataTypesDefinition as any)[property.type]) {
    const type = getTypeFromSubType(property.type);
    if (!type) {
      throw new Error(
        `Property type "${property.type}" not recognized and no subType was found for it.`
      );
    }
    property.subType = property.type;
    property.type = type;
  }

  return property;
};

export const PropertyEditor = ({
  onSubmit,
  onCancel,
  defaultValue,
  parentObject,
  ...rest
}: Props) => {
  const [isAdvancedSettingsVisible, setIsAdvancedSettingsVisible] = useState<boolean>(false);

  const { form } = useForm({
    defaultValue,
    serializer,
    deserializer,
  });
  const isEditMode = typeof defaultValue !== 'undefined';

  const submitForm = async () => {
    const { isValid: isFormValid, data: formData } = await form.submit();

    if (isFormValid) {
      const data =
        defaultValue && defaultValue.properties
          ? { ...formData, properties: defaultValue.properties }
          : formData;
      onSubmit(data);
    }
  };

  const toggleAdvancedSettings = () => {
    setIsAdvancedSettingsVisible(previous => !previous);
  };

  const renderAdvancedSettings = (type: DataType | SubType) => {
    const AdvancedSettingsComponent = getAdvancedSettingsCompForType(type);

    if (!isAdvancedSettingsVisible || !AdvancedSettingsComponent) {
      return null;
    }
    return (
      <Fragment>
        <EuiSpacer size="m" />
        <div style={{ backgroundColor: '#F5F7FA', padding: '12px' }}>
          <AdvancedSettingsComponent />
        </div>
      </Fragment>
    );
  };

  return (
    <Form form={form} className="property-editor">
      <FormDataProvider pathsToWatch="type">
        {formData => {
          const selectedDatatype = formData.type as DataType;
          const typeDefinition = dataTypesDefinition[selectedDatatype];

          return (
            <Fragment>
              <EuiFlexGroup>
                {/* Field name */}
                <EuiFlexItem grow={false}>
                  <UseField
                    path="name"
                    defaultValue={isEditMode ? undefined : defaultValueParam('name')} // "undefined" means: look into the "defaultValue" object passed to the form
                    config={{
                      ...getFieldConfig('name'),
                      validations: updateNameParameterValidations(
                        getFieldConfig('name'),
                        parentObject,
                        form.getFieldDefaultValue('name') as string
                      ),
                    }}
                    component={getComponentForParameter('name')}
                    componentProps={{ parentObject }}
                  />
                </EuiFlexItem>

                {/* Field type */}
                <EuiFlexItem grow={false}>
                  <UseField
                    path="type"
                    config={getFieldConfig('type')}
                    defaultValue={isEditMode ? undefined : defaultValueParam('type')}
                  >
                    {field => (
                      <EuiFormRow label={field.label} helpText={field.helpText} fullWidth>
                        <EuiSelect
                          fullWidth
                          value={field.value as string}
                          onChange={e => {
                            setIsAdvancedSettingsVisible(false);
                            field.setValue(e.target.value);
                          }}
                          hasNoInitialSelection={true}
                          isInvalid={false}
                          options={Object.entries(dataTypesDefinition).map(
                            ([value, { label }]) => ({
                              value,
                              text: label,
                            })
                          )}
                        />
                      </EuiFormRow>
                    )}
                  </UseField>
                </EuiFlexItem>

                {/* Field sub type (if any) */}
                {typeDefinition && typeDefinition.subTypes && (
                  <EuiFlexItem grow={false}>
                    <UseField
                      path="subType"
                      defaultValue={
                        isEditMode && selectedDatatype === defaultValue!.type
                          ? undefined
                          : typeDefinition.subTypes.types[0]
                      }
                      config={{
                        ...getFieldConfig('type'),
                        label: typeDefinition.subTypes.label,
                      }}
                      component={Field}
                      componentProps={{
                        euiFieldProps: {
                          options: typeDefinition.subTypes.types.map(type => ({
                            value: type,
                            text: type,
                          })),
                          hasNoInitialSelection: false,
                        },
                      }}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>

              {((typeDefinition && typeDefinition.basicParameters) ||
                getAdvancedSettingsCompForType(selectedDatatype)) && (
                <Fragment>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup justifyContent="spaceBetween">
                    {typeDefinition && typeDefinition.basicParameters && (
                      <EuiFlexItem>
                        {/* Basic parameters for the selected type */}
                        <PropertyBasicParameters
                          typeDefinition={typeDefinition}
                          isEditMode={isEditMode}
                        />
                      </EuiFlexItem>
                    )}
                    {getAdvancedSettingsCompForType(selectedDatatype) && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty size="s" onClick={toggleAdvancedSettings}>
                          {isAdvancedSettingsVisible ? 'Hide' : 'Show'} advanced settings
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </Fragment>
              )}

              {renderAdvancedSettings(selectedDatatype)}

              <EuiSpacer size="l" />
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="primary" onClick={onCancel}>
                    Cancel
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="secondary"
                    fill
                    size="s"
                    onClick={submitForm}
                    isDisabled={form.isSubmitted && !form.isValid}
                  >
                    {isEditMode ? 'Done' : 'Add'}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          );
        }}
      </FormDataProvider>
    </Form>
  );
};
