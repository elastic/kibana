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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import {
  UseField,
  Form,
  FormDataProvider,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
import { Field } from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/components';

import { parametersDefinition, dataTypesDefinition, DataType, SubType } from '../config';
import { hasNestedProperties } from '../helpers';
import { PropertyBasicParameters } from './property_basic_parameters';
import { PropertiesManager } from './properties_manager';
import { getComponentForParameter } from './parameters';
import { getAdvancedSettingsCompForType } from './advanced_settings';

interface Props {
  form: Form;
  onRemove?: () => void;
  fieldPathPrefix?: string;
  isDeletable?: boolean;
  isEditMode?: boolean;
}

export const PropertyEditor = ({
  form,
  fieldPathPrefix = '',
  onRemove = () => undefined,
  isDeletable = true,
  isEditMode = false,
}: Props) => {
  const [isAdvancedSettingsVisible, setIsAdvancedSettingsVisible] = useState<boolean>(false);
  const renderNestedProperties = (selectedType: DataType, fieldName: string) =>
    hasNestedProperties(selectedType) ? (
      <Fragment>
        <EuiSpacer size="l" />
        <PropertiesManager
          form={form}
          parentType={selectedType}
          path={fieldPathPrefix}
          fieldName={fieldName}
        />
      </Fragment>
    ) : null;

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
        <AdvancedSettingsComponent />
      </Fragment>
    );
  };

  return (
    <FormDataProvider form={form} pathsToWatch={[`${fieldPathPrefix}type`]}>
      {formData => {
        const selectedDatatype = formData[`${fieldPathPrefix}type`] as DataType;
        const typeDefinition = dataTypesDefinition[selectedDatatype];

        return (
          <div className="property-editor ">
            <EuiFlexGroup justifyContent="spaceBetween">
              {/* Field name */}
              <EuiFlexItem grow={false}>
                <UseField
                  path={`${fieldPathPrefix}name`}
                  form={form}
                  defaultValue={isEditMode ? undefined : ''} // "undefined" means: look into the "defaultValue" object passed to the form
                  config={parametersDefinition.name.fieldConfig}
                  component={getComponentForParameter('name')}
                />
              </EuiFlexItem>

              {/* Field type */}
              <EuiFlexItem grow={false}>
                <UseField
                  path={`${fieldPathPrefix}type`}
                  form={form}
                  config={parametersDefinition.type.fieldConfig}
                  defaultValue={isEditMode ? undefined : 'text'}
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
                        options={Object.entries(dataTypesDefinition).map(([value, { label }]) => ({
                          value,
                          text: label,
                        }))}
                      />
                    </EuiFormRow>
                  )}
                </UseField>
              </EuiFlexItem>

              {/* Field sub type (if any) */}
              {typeDefinition && typeDefinition.subTypes && (
                <EuiFlexItem grow={false}>
                  <UseField
                    path={`${fieldPathPrefix}subType`}
                    form={form}
                    defaultValue={isEditMode ? undefined : typeDefinition.subTypes.types[0]}
                    config={{
                      ...parametersDefinition.type.fieldConfig,
                      label: typeDefinition.subTypes.label,
                    }}
                    component={Field}
                    componentProps={{
                      fieldProps: {
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
              {/* Empty flex item to fill the space in between */}
              <EuiFlexItem />

              {/* Delete field button */}
              {isDeletable && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="danger"
                    iconType="trash"
                    onClick={onRemove}
                    aria-label="Remove property"
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
                        form={form}
                        typeDefinition={typeDefinition}
                        fieldPathPrefix={fieldPathPrefix}
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

            <FormDataProvider form={form} pathsToWatch={[`${fieldPathPrefix}name`]}>
              {_formData => {
                const nameValue = _formData[`${fieldPathPrefix}name`] as string;
                return renderNestedProperties(selectedDatatype, nameValue);
              }}
            </FormDataProvider>
          </div>
        );
      }}
    </FormDataProvider>
  );
};
