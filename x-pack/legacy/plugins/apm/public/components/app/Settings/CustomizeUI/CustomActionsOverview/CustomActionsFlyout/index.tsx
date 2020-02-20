/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFormRow,
  EuiFieldText,
  EuiForm
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Filter, FiltersSection } from './FiltersSection';

interface Props {
  onClose: () => void;
}

const actionFields = [
  {
    type: 'text',
    name: 'label',
    label: 'Label',
    helpText: 'Labels can be a maximum of 128 characters',
    placeholder: 'e.g. Support tickets',
    register: { required: true, maxLength: 128 }
  },
  {
    type: 'text',
    name: 'url',
    label: 'URL',
    helpText:
      'Add fieldname variables to your URL to apply values e.g. {{trace.id}}. TODO: Learn more in the docs.',
    placeholder: 'e.g. https://www.elastic.co/',
    register: { required: true }
  }
];

interface FormData {
  label: string;
  url: string;
  filters: Filter[];
}

const FILTERS = 'filters';

export const CustomActionsFlyout = ({ onClose }: Props) => {
  const { register, handleSubmit, watch, errors, setValue } = useForm<
    FormData
  >();
  const onSubmit = (data: FormData) => {
    console.log('#########', data);
  };

  const handleFiltersChange = (filters: Filter[]) => {
    setValue(FILTERS, filters);
  };

  useEffect(() => {
    register({ name: FILTERS });
  }, [register]);

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={onClose} size="m">
        <form onSubmit={handleSubmit(onSubmit)}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyout.title',
                  {
                    defaultMessage: 'Create custom action'
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyout.label',
                  {
                    defaultMessage:
                      "This action will be shown in the 'Actions' context menu for the trace and error detail components. You can specify any number of links, but only the first three will be shown, in alphabetical order."
                  }
                )}
              </p>
            </EuiText>

            <EuiSpacer size="l" />
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
            {actionFields.map(field => {
              return (
                <EuiFormRow
                  key={field.name}
                  label={field.label}
                  helpText={field.helpText}
                  labelAppend={<EuiText size="xs">Required</EuiText>}
                >
                  <EuiFieldText
                    inputRef={register(field.register)}
                    placeholder={field.placeholder}
                    name={field.name}
                  />
                </EuiFormRow>
              );
            })}
            <EuiSpacer size="l" />
            <FiltersSection onFiltersChange={handleFiltersChange} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                  {i18n.translate(
                    'xpack.apm.settings.customizeUI.customActions.flyout.close',
                    {
                      defaultMessage: 'Close'
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill type="submit">
                  {i18n.translate(
                    'xpack.apm.settings.customizeUI.customActions.flyout.save',
                    {
                      defaultMessage: 'Save'
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </form>
      </EuiFlyout>
    </EuiPortal>
  );
};
