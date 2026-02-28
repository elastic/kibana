/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const noop = () => {};

const CLOUD_ID_PLACEHOLDER = 'fake_cloud_id:24h124h11249u31r4';

const CloudIdFormRowLabel: React.FC = () => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" css={{ minWidth: 0 }}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">
        {i18n.translate('xpack.fleet.integrations.connectionDetails.cloudIdLabel', {
          defaultMessage: 'Cloud ID',
        })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="question"
        size="xs"
        onClick={noop}
        aria-label={i18n.translate(
          'xpack.fleet.integrations.connectionDetails.cloudIdHelpAriaLabel',
          {
            defaultMessage: 'Cloud ID help',
          }
        )}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const ConnectionDetailsPopoverButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const button = (
    <EuiButtonIcon
      size="xs"
      color="text"
      iconType="globe"
      onClick={() => setIsOpen(!isOpen)}
      data-test-subj="headerGlobalNav-appActionsConnectionDetailsButton"
      aria-label={i18n.translate('xpack.fleet.integrations.connectionDetailsButton', {
        defaultMessage: 'Connection details',
      })}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiFormRow label={<CloudIdFormRowLabel />} fullWidth css={{ minWidth: 420 }}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiFieldText
              value={CLOUD_ID_PLACEHOLDER}
              readOnly
              fullWidth
              compressed
              data-test-subj="connectionDetailsCloudId"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="copyClipboard"
              size="s"
              display="base"
              onClick={noop}
              aria-label={i18n.translate('xpack.fleet.integrations.connectionDetails.copyCloudId', {
                defaultMessage: 'Copy Cloud ID',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="both" size="s" onClick={noop} color="primary">
            {i18n.translate('xpack.fleet.integrations.connectionDetails.createManageApiKeys', {
              defaultMessage: 'Create and manage API keys',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="both"
            size="s"
            onClick={noop}
            color="primary"
            iconType="popout"
            iconSide="right"
          >
            {i18n.translate('xpack.fleet.integrations.connectionDetails.learnMore', {
              defaultMessage: 'Learn more',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

/**
 * Header app actions config for the Integrations app (secondary: New, Connection details; no primary).
 * POC: all actions are dumb (onClick: noop). Set when app mounts; platform clears on app change.
 */
export function getIntegrationsHeaderAppActionsConfig() {
  return {
    secondaryActions: [
      <EuiButtonIcon
        key="integrations-new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={noop}
        data-test-subj="headerGlobalNav-appActionsNewButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
      <ConnectionDetailsPopoverButton key="integrations-connection-details" />,
    ],
    primaryActions: [],
  };
}
