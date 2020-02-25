/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CustomActionFormData } from './';

interface InputField {
  name: keyof CustomActionFormData;
  label: string;
  helpText: string;
  placeholder: string;
  onChange: (value: string) => void;
  value?: string;
}

interface Props {
  label?: string;
  onChangeLabel: (label: string) => void;
  url?: string;
  onChangeUrl: (url: string) => void;
}

export const ActionSection = ({
  label,
  onChangeLabel,
  url,
  onChangeUrl
}: Props) => {
  const inputFields: InputField[] = [
    {
      name: 'label',
      label: 'Label',
      helpText:
        'This is the label shown in the actions context menu. Keep it as short as possible.',
      placeholder: 'e.g. Support tickets',
      value: label,
      onChange: onChangeLabel
    },
    {
      name: 'url',
      label: 'URL',
      helpText:
        'Add fieldname variables to your URL to apply values e.g. {{trace.id}}. TODO: Learn more in the docs.',
      placeholder: 'e.g. https://www.elastic.co/',
      value: url,
      onChange: onChangeUrl
    }
  ];

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
      {inputFields.map(field => {
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
              placeholder={field.placeholder}
              name={field.name}
              fullWidth
              value={field.value}
              onChange={e => field.onChange(e.target.value)}
            />
          </EuiFormRow>
        );
      })}
    </>
  );
};
