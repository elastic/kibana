/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ProcessorDefinition } from '@kbn/streams-schema';
import {
  ConfigDrivenProcessorFormState,
  ConfigDrivenProcessorType,
  FieldConfiguration,
  FieldOptions,
} from './types';

export const getConvertFormStateToConfig = <
  FormState extends ConfigDrivenProcessorFormState,
  ProcessorState extends ProcessorDefinition
>(
  key: ConfigDrivenProcessorType,
  fieldConfigurations: FieldConfiguration[],
  fieldOptions: FieldOptions
): ((formState: FormState) => ProcessorState) => {
  return (formState: FormState): ProcessorState => {
    const state = Object.keys(formState).reduce((acc: Record<string, unknown>, field) => {
      const value = formState[field as keyof FormState];

      if (field === 'field') {
        acc.field = value;
      } else if (field === 'ignore_failure' && fieldOptions.includeIgnoreFailures) {
        acc.ignore_failure = value;
      } else if (field === 'ignore_missing' && fieldOptions.includeIgnoreMissing) {
        acc.ignore_missing = value;
      } else if (field === 'if' && fieldOptions.includeCondition) {
        acc.if = value;
      } else {
        const fieldConfig = fieldConfigurations.find((config) => config.field === field);

        if (!fieldConfig) {
          return acc;
        }

        if (fieldConfig.type === 'boolean') {
          acc[field] = value;
        } else if (fieldConfig.type === 'array' || fieldConfig.type === 'string') {
          if (fieldConfig.required) {
            acc[field] = value;
          } else {
            acc[field] = isEmpty(value) ? undefined : value;
          }
        }
      }

      return acc;
    }, {});

    return {
      [key]: state,
    } as unknown as ProcessorState;
  };
};

export const getConvertProcessorToFormState = <
  ProcessorState extends ProcessorDefinition,
  FormState extends ConfigDrivenProcessorFormState
>(
  key: ConfigDrivenProcessorType,
  defaultFormState: FormState
): ((processorState: ProcessorState) => FormState) => {
  return (processorState: ProcessorState): FormState => {
    const processor = processorState[key as keyof ProcessorState] as Record<string, unknown>;
    const values = Object.keys(processor).reduce(
      (acc, field) => {
        const value = processor[field];

        if (value !== undefined) {
          acc[field as keyof FormState] = value as FormState[keyof FormState];
        }

        return acc;
      },
      { ...defaultFormState }
    );

    return structuredClone({
      ...values,
      type: key as FormState['type'],
    });
  };
};
