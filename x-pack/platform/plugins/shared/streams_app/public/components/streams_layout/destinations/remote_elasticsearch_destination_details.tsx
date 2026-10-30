/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DESTINATION_AUTO_MODE_LABEL,
  DESTINATION_FIXED_INDEX_MODE_LABEL,
  DESTINATION_SIGNAL_LABELS,
} from './destination_type_config';
import type { RemoteElasticsearchDestinationViewModel } from './types';

const ENDPOINT_LABEL = i18n.translate(
  'xpack.streams.destinations.remoteElasticsearchDetails.endpointLabel',
  { defaultMessage: 'Endpoint' }
);

const ROUTING_LABEL = i18n.translate(
  'xpack.streams.destinations.remoteElasticsearchDetails.routingLabel',
  { defaultMessage: 'Routing' }
);

const API_KEY_LABEL = i18n.translate(
  'xpack.streams.destinations.remoteElasticsearchDetails.apiKeyLabel',
  { defaultMessage: 'API key' }
);

const CONFIGURED_LABEL = i18n.translate(
  'xpack.streams.destinations.remoteElasticsearchDetails.configuredValue',
  { defaultMessage: 'Configured' }
);

const detailsStyles = css`
  overflow-wrap: anywhere;
`;

interface RemoteElasticsearchDestinationDetailsProps {
  destination: RemoteElasticsearchDestinationViewModel;
  showHeader?: boolean;
  titleId?: string;
}

const getRoutingItems = ({
  mode,
  signals,
  indexBySignal,
}: RemoteElasticsearchDestinationViewModel): NonNullable<EuiDescriptionListProps['listItems']> => {
  if (mode === 'auto') {
    return [{ title: ROUTING_LABEL, description: DESTINATION_AUTO_MODE_LABEL }];
  }
  return [
    { title: ROUTING_LABEL, description: DESTINATION_FIXED_INDEX_MODE_LABEL },
    ...signals.map((signal) => ({
      title: DESTINATION_SIGNAL_LABELS[signal],
      description: indexBySignal[signal] ?? DESTINATION_AUTO_MODE_LABEL,
    })),
  ];
};

export const RemoteElasticsearchDestinationDetails = ({
  destination,
  showHeader = false,
  titleId,
}: RemoteElasticsearchDestinationDetailsProps) => (
  <div data-test-subj="streamsRemoteElasticsearchDestinationDetails" css={detailsStyles}>
    {showHeader && (
      <>
        <EuiTitle size="s">
          <h2 id={titleId}>{destination.name}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </>
    )}
    <EuiDescriptionList
      compressed
      listItems={[
        { title: ENDPOINT_LABEL, description: destination.endpoint },
        ...getRoutingItems(destination),
        { title: API_KEY_LABEL, description: CONFIGURED_LABEL },
      ]}
    />
  </div>
);
