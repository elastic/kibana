/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useFormData, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { addMeta, getMeta } from '../../../schema_connector_metadata';
import {
  getDiscriminatorFieldValue,
  type DiscriminatedUnionWidgetProps,
} from './discriminated_union_widget';
import { SingleOptionUnionWidget } from './single_option_union_widget';

/* This widget represents the whole discriminated union. For example:
 * z.discriminatedUnion('type', [
 *   z.object({ type: z.literal('none') }),
 *   z.object({ type: z.literal('basic'), token: z.string() })
 * ]).default({ type: 'basic', token: 'my-default-token' })
 *
 * in this MultiOptionUnionWidget component,
 *   options: [
 *     z.object({ type: z.literal('none') }),
 *     z.object({ type: z.literal('basic'), token: z.string() })
 *   ]
 *   discriminatorKey: 'type'
 *   defaultValue: { type: 'basic', token: 'my-default-token' }
 */

/*
 * Gets the default option from the discriminated union options based on the fieldConfig defaultValue.
 * If no matching defaultValue is found, returns the first option.
 *
 * @param options - The array of discriminated union options
 * @param discriminatorKey - The key used to discriminate between options
 * @param fieldConfig - The field configuration which may contain a defaultValue
 * @returns The default option object
 */
const getDefaultOption = (
  options: DiscriminatedUnionWidgetProps['options'],
  discriminatorKey: string,
  fieldConfig: DiscriminatedUnionWidgetProps['fieldConfig']
) => {
  if (fieldConfig.defaultValue && typeof fieldConfig.defaultValue === 'object') {
    const defaultValue = fieldConfig.defaultValue as Record<string, any>;
    const defaultOption = options.find(
      (option) =>
        getDiscriminatorFieldValue(option, discriminatorKey) === defaultValue[discriminatorKey]
    );
    if (defaultOption) {
      return defaultOption;
    }
  }
  return options[0];
};

/*
 * MultiOptionUnionWidget component renders a set of checkable cards for each option in a discriminated union.
 * When an option is selected, it renders the corresponding SingleOptionUnionWidget for that option.
 *
 * @param props - DiscriminatedUnionWidgetProps
 * @param props.path - The root path for the form fields
 * @param props.options - The array of discriminated union options
 * @param props.discriminatorKey - The key used to discriminate between options
 * @param props.schema - The overall schema containing the discriminated union
 * @param props.fieldConfig - Configuration for the field, including default values
 * @param props.fieldProps - Additional properties for the field, such as label
 * @param props.formConfig - Configuration for the form, such as read-only state
 * @returns React element representing the multi-option union widget
 */
export const MultiOptionUnionWidget: React.FC<DiscriminatedUnionWidgetProps> = ({
  path: rootPath,
  options,
  discriminatorKey,
  schema,
  fieldConfig,
  fieldProps,
  formConfig,
}) => {
  const [selectedOption, setSelectedOption] = useState(() => {
    const defaultOption = getDefaultOption(options, discriminatorKey, fieldConfig);
    return getDiscriminatorFieldValue(defaultOption, discriminatorKey);
  });

  const [formData] = useFormData();
  const { setFieldValue } = useFormContext();

  const hasInitializedFromFormData = useRef(false);
  const discriminatorValueFromForm = formData[rootPath]?.[discriminatorKey] as string | undefined;
  const discriminatorFieldPath = `${rootPath}.${discriminatorKey}`;

  useEffect(() => {
    if (discriminatorValueFromForm && !hasInitializedFromFormData.current) {
      setSelectedOption(discriminatorValueFromForm);
      hasInitializedFromFormData.current = true;
      return;
    }

    // After initialization: Sync selectedOption changes back to form data
    // This happens when user clicks a different option
    if (hasInitializedFromFormData.current && discriminatorValueFromForm !== selectedOption) {
      setFieldValue(discriminatorFieldPath, selectedOption);
    }
  }, [discriminatorFieldPath, discriminatorValueFromForm, selectedOption, setFieldValue]);

  const isFieldsetDisabled = formConfig.disabled || getMeta(schema).disabled;

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="xxs">
            <h4>{fieldProps.label as string}</h4>
          </EuiTitle>
        ),
      }}
    >
      {options.map((option) => {
        const discriminatorValue = getDiscriminatorFieldValue(option, discriminatorKey) as string;
        const onChange = () => setSelectedOption(discriminatorValue);
        const optionMeta = getMeta(option);
        const label = optionMeta.label;
        const isChecked = selectedOption === discriminatorValue;

        // if the entire fieldset is disabled, ensure each option is also marked as disabled
        if (isFieldsetDisabled && optionMeta.disabled !== false) {
          addMeta(option, { disabled: true });
        }
        const isDisabled = getMeta(option).disabled;

        return (
          <React.Fragment key={discriminatorValue}>
            <EuiCheckableCard
              onChange={onChange}
              label={label as string}
              id={discriminatorValue}
              checked={isChecked}
              data-test-subj={`form-generator-field-${rootPath}-${discriminatorValue}`}
              disabled={isDisabled}
            >
              {isChecked && (
                <SingleOptionUnionWidget
                  options={[option]}
                  path={rootPath}
                  schema={schema}
                  discriminatorKey={discriminatorKey}
                  fieldConfig={fieldConfig}
                  fieldProps={fieldProps}
                  formConfig={formConfig}
                />
              )}
            </EuiCheckableCard>
            <EuiSpacer size="xs" />
          </React.Fragment>
        );
      })}
    </EuiFormFieldset>
  );
};
