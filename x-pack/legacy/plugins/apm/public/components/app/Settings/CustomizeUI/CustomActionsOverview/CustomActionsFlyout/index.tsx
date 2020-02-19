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
  EuiSelect,
  EuiFieldText
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { isEmpty } from 'lodash';
import { FormType, useForm } from './useForm';
import { FieldsSection, Field } from './FieldsSection';

interface Props {
  onClose: () => void;
}

const actionFields: FormType = [
  {
    type: 'text',
    name: 'label',
    label: 'Label',
    helpText: 'Labels can be a maximum of 128 characters',
    placeholder: 'e.g. Support tickets'
  },
  {
    type: 'text',
    name: 'url',
    label: 'URL',
    helpText: 'You can use relative paths by prefixing with e.g. /dashboards',
    placeholder: 'e.g. https://www.elastic.co/'
  }
];

export const CustomActionsFlyout = ({ onClose }: Props) => {
  const { label, url, Form } = useForm({
    fields: actionFields,
    title: i18n.translate(
      'xpack.apm.settings.customizeUI.customActions.flyOut.action.title',
      { defaultMessage: 'Action' }
    )
  });
  const [fields, setFields] = useState([] as Field[]);

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={onClose} size="m">
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
          <Form />

          <FieldsSection onFieldsChange={setFields} />
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
              <EuiButton fill>
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
      </EuiFlyout>
    </EuiPortal>
  );
};
