/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import type { ActionConnector } from '../../../../types';
import { upgradeActionConnector } from '../../../lib/action_connector_api';

export type ConnectorUpgradeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; toVersion: string }
  | { status: 'reconfiguration_required' }
  | { status: 'error' };

interface UseConnectorUpgradeProps {
  connectorId: string;
  http: HttpSetup;
  onConnectorUpdated: (connector: ActionConnector) => void;
}

export const useConnectorUpgrade = ({
  connectorId,
  http,
  onConnectorUpdated,
}: UseConnectorUpgradeProps) => {
  const isMounted = useRef(true);
  const isRequestInFlight = useRef(false);
  const [state, setState] = useState<ConnectorUpgradeState>({ status: 'idle' });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setState({ status: 'idle' });
  }, [connectorId]);

  const upgradeConnector = useCallback(async () => {
    if (isRequestInFlight.current) {
      return;
    }

    isRequestInFlight.current = true;
    setState({ status: 'loading' });

    try {
      const result = await upgradeActionConnector({ http, id: connectorId });
      if (!isMounted.current) {
        return;
      }

      const { status } = result;
      switch (status) {
        case 'current':
          onConnectorUpdated(result.connector);
          setState({ status: 'idle' });
          break;
        case 'upgraded':
          onConnectorUpdated(result.connector);
          setState({ status: 'success', toVersion: result.toVersion });
          break;
        case 'reconfiguration_required':
          setState({ status: 'reconfiguration_required' });
          break;
        default: {
          const exhaustiveStatus: never = status;
          return exhaustiveStatus;
        }
      }
    } catch {
      if (isMounted.current) {
        setState({ status: 'error' });
      }
    } finally {
      isRequestInFlight.current = false;
    }
  }, [connectorId, http, onConnectorUpdated]);

  return {
    state,
    isUpgrading: state.status === 'loading',
    upgradeConnector,
  };
};
