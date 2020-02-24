/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  ValidationOptions,
  FormContextValues,
  NestDataObject
} from 'react-hook-form';
import {
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFieldText,
  EuiFormRow
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { CustomActionFormData } from './';

interface ActionField {
  name: keyof CustomActionFormData;
  label: string;
  helpText: string;
  placeholder: string;
  register: ValidationOptions;
}

const actionFields: ActionField[] = [
  {
    name: 'label',
    label: 'Label',
    helpText:
      'Keep it as short as possible. This is the label shown in the actions context menu.',
    placeholder: 'e.g. Support tickets',
    register: { required: true }
  },
  {
    name: 'url',
    label: 'URL',
    helpText:
      'Add fieldname variables to your URL to apply values e.g. {{trace.id}}. TODO: Learn more in the docs.',
    placeholder: 'e.g. https://www.elastic.co/',
    register: { required: true }
  }
];

interface ActionSectionProps {
  register: FormContextValues['register'];
  errors: NestDataObject<CustomActionFormData>;
}

export const ActionSection = ({ register, errors }: ActionSectionProps) => {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customActions.flyout.action.title',
            {
              defaultMessage: 'Action'
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="l" />
      {actionFields.map((field: ActionField) => {
        return (
          <EuiFormRow
            fullWidth
            key={field.name}
            label={field.label}
            helpText={field.helpText}
            labelAppend={
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyout.required',
                  {
                    defaultMessage: 'Required'
                  }
                )}
              </EuiText>
            }
          >
            <EuiFieldText
              inputRef={register(field.register)}
              placeholder={field.placeholder}
              name={field.name}
              fullWidth
              isInvalid={!isEmpty(errors[field.name])}
            />
          </EuiFormRow>
        );
      })}
    </>
  );
};
