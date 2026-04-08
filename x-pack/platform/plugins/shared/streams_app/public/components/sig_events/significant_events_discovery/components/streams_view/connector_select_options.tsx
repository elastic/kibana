/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AIConnector } from '@kbn/inference-connectors';
import React from 'react';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';

export const buildConnectorSelectOptions = (connectors: AIConnector[]) =>
  connectors.map((connector) => ({
    value: connector.id,
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ConnectorIcon connectorName={connector.name} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{connector.name}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));
