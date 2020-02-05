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

export const Flyout = ({ onClose }: Props) => {
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
                'xpack.apm.settings.customizeUI.customAction.flyout.title',
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
                'xpack.apm.settings.customizeUI.customAction.flyout.label',
                {
                  defaultMessage:
                    'Action will be shown in the Actions context menu by the trace and error details. You can specify an unlimited amount of links, but we will opt to only show the first 3 alphabetically.'
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <ServiceForm
            isReadOnly={false}
            serviceName={serviceName}
            setServiceName={setServiceName}
            environment={environment}
            setEnvironment={setEnvironment}
          />

          <EuiSpacer size="l" />

          <SettingsSection
            label={label}
            setLabel={setLabel}
            url={url}
            setURL={setURL}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                // TODO: onClick={this.closeFlyout}
                fill
              >
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
