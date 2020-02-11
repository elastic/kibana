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
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SettingsSection } from './SettingsSection';
import { ServiceForm } from '../../../../../shared/ServiceForm';

interface Props {
  onClose: () => void;
}

export const CustomActionsFlyout = ({ onClose }: Props) => {
  const [serviceName, setServiceName] = useState('');
  const [environment, setEnvironment] = useState('');
  const [label, setLabel] = useState('');
  const [url, setURL] = useState('');
  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={onClose} size="s">
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
          <ServiceForm
            isReadOnly={false}
            serviceName={serviceName}
            onServiceNameChange={setServiceName}
            environment={environment}
            onEnvironmentChange={setEnvironment}
          />

          <EuiSpacer size="l" />

          <SettingsSection
            label={label}
            onLabelChange={setLabel}
            url={url}
            onURLChange={setURL}
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
              <EuiButton
                // TODO: onClick={closeFlyout}
                fill
              >
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
