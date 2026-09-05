/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { Badge, BadgeGroup, Callout, View, toViewSpec } from '@kbn/adaptive-ui/jsx';

/**
 * Mirror of the `connector_setup` attachment data (Agent Builder platform). Only
 * the presentational prompt subset is mirrored; the live connect flow is out of
 * scope.
 */
export interface ConnectorSetupData {
  connector_type?: string;
  connected?: boolean;
  reason?: string;
}

/**
 * Alternate rendering for the `connector_setup` attachment (prompt subset): a
 * connected/setup-needed badge over a callout explaining why a connector is
 * required.
 */
export const toConnectorSetupViewSpec = ({
  connector_type: connectorType,
  connected,
  reason,
}: ConnectorSetupData): ViewSpec => {
  const label = connectorType ? `${connectorType} connector` : 'Connector';
  return toViewSpec(
    <View title={label} subtitle="Connector setup">
      <BadgeGroup>
        {connected ? (
          <Badge label="Connected" tone="success" variant="fill" />
        ) : (
          <Badge label="Setup needed" tone="warning" variant="fill" />
        )}
      </BadgeGroup>
      {reason && (
        <Callout
          tone={connected ? 'success' : 'warning'}
          title={connected ? 'Connector ready' : 'Connector setup required'}
        >
          {reason}
        </Callout>
      )}
    </View>
  );
};

export const sampleConnectorSetup: ConnectorSetupData = {
  connector_type: 'OpenAI',
  connected: false,
  reason:
    'This agent needs a generative AI connector to draft summaries. Connect an OpenAI connector to continue.',
};
