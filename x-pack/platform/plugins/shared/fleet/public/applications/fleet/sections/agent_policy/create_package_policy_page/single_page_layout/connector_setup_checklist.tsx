/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1";
 */

import React from 'react';
import {
  EuiCallOut,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { ConnectorChecklistItem } from '../../../../../../../common/services';
import { isConnectorSetupComplete } from '../../../../../../../common/services';

export interface ConnectorSetupChecklistProps {
  items: ConnectorChecklistItem[];
}

/**
 * FLEET-013 · Connector-setup checklist for Kibana-only integrations.
 *
 * Shown in place of the Elastic Agent policy step. A Kibana-only integration does
 * no work until its connectors are wired, so this makes the real prerequisite
 * explicit instead of leaving admins in an agent-policy flow that does not apply.
 */
export const ConnectorSetupChecklist: React.FunctionComponent<ConnectorSetupChecklistProps> = ({
  items,
}) => {
  if (items.length === 0) {
    return null;
  }

  const complete = isConnectorSetupComplete(items);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="connectorSetupChecklist">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.connectorChecklistTitle"
            defaultMessage="Connector setup"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.connectorChecklistDescription"
            defaultMessage="This integration runs entirely in Kibana — no Elastic Agent is required. It needs the following connectors to be configured before its workflows can run."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {items.map((item) => (
        <div key={item.name} data-test-subj={`connectorChecklistItem-${item.name}`}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={item.configured ? 'checkInCircleFilled' : 'dot'}
                color={item.configured ? 'success' : 'warning'}
                data-test-subj={
                  item.configured
                    ? `connectorChecklistConfigured-${item.name}`
                    : `connectorChecklistPending-${item.name}`
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{item.title}</EuiText>
            </EuiFlexItem>
            {item.required ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.fleet.createPackagePolicy.connectorRequiredBadge', {
                    defaultMessage: 'Required',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {item.description ? (
            <EuiText size="xs" color="subdued">
              <p>{item.description}</p>
            </EuiText>
          ) : null}
          <EuiSpacer size="s" />
        </div>
      ))}

      <EuiCallOut
        size="s"
        color={complete ? 'success' : 'warning'}
        data-test-subj={complete ? 'connectorSetupComplete' : 'connectorSetupIncomplete'}
        title={
          complete
            ? i18n.translate('xpack.fleet.createPackagePolicy.connectorSetupCompleteTitle', {
                defaultMessage:
                  'All required connectors are configured. Workflows will be enabled on install.',
              })
            : i18n.translate('xpack.fleet.createPackagePolicy.connectorSetupIncompleteTitle', {
                defaultMessage:
                  'Configure the required connectors above. Workflows install but stay disabled until they are set.',
              })
        }
      />
    </EuiPanel>
  );
};
