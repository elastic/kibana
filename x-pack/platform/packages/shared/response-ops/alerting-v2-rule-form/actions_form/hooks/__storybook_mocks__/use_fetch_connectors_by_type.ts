/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import type { SingleStepConnector } from '../use_fetch_connectors_by_type';

const MOCK_CONNECTORS_BY_TYPE: Record<string, SingleStepConnector[]> = {
  '.email': [
    {
      id: 'email-ops',
      name: 'On-call email',
      connectorTypeId: '.email',
      isMissingSecrets: false,
      isDeprecated: false,
    },
    {
      id: 'email-team',
      name: 'Team distro',
      connectorTypeId: '.email',
      isMissingSecrets: false,
      isDeprecated: false,
    },
  ],
  '.slack2': [
    {
      id: 'slack2-alerts',
      name: 'slack2 Connector',
      connectorTypeId: '.slack2',
      isMissingSecrets: false,
      isDeprecated: false,
    },
  ],
};

export const useFetchConnectorsByType = ({
  connectorTypeId,
}: {
  connectorTypeId: string | null;
  isEnabled?: boolean;
}) =>
  ({
    data: connectorTypeId ? MOCK_CONNECTORS_BY_TYPE[connectorTypeId] ?? [] : [],
    isLoading: false,
  } as UseQueryResult<SingleStepConnector[], Error>);
