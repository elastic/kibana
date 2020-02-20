/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { Controller, useForm, ValidationOptions } from 'react-hook-form';
import { Filter, FiltersSection } from './FiltersSection';

interface Props {
  onClose: () => void;
}

interface FormData {
  label: string;
  url: string;
  filters: Filter[];
}

interface ActionField {
  name: keyof FormData;
  label: string;
  helpText: string;
  placeholder: string;
  register: ValidationOptions;
}

const actionFields: ActionField[] = [
  {
    name: 'label',
    label: 'Label',
    helpText: 'Labels can be a maximum of 128 characters',
    placeholder: 'e.g. Support tickets',
    register: { required: true, maxLength: 128 }
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

export const CustomActionsFlyout = ({ onClose }: Props) => {
  const { register, handleSubmit, errors, control, watch } = useForm<
    FormData
  >();
  const onSubmit = (data: FormData) => {
    console.log('#########', data);
  };

  const filters = watch('filters');

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
            {actionFields.map((field: ActionField) => {
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
                    fullWidth
                    isInvalid={!isEmpty(errors[field.name])}
                  />
                </EuiFormRow>
              );
            })}
            <EuiSpacer size="l" />

            <Controller
              as={<FiltersSection filters={filters} />}
              name="filters"
              control={control}
              defaultValue={filters}
            />
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
