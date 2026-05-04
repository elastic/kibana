/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const SimulatedSourcesBanner: React.FC = () => {
  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={i18n.translate('xpack.streams.ingestFlow.mockBanner.title', {
        defaultMessage: 'Simulated data sources active',
      })}
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.ingestFlow.mockBanner.body', {
            defaultMessage:
              'Cloud Pipelines OTLP endpoints and Prometheus scrapers are simulated with synthetic metrics. Fleet agents, stream topology, throughput rates, and failure rates are real data.',
          })}
        </p>
      </EuiText>
    </EuiCallOut>
  );
};
