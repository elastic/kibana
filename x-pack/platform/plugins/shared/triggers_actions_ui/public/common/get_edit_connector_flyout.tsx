/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ResponseOpsQueryClientProvider } from '@kbn/response-ops-react-query/providers/response_ops_query_client_provider';
import { ConnectorProvider } from '../application/context/connector_context';
import { EditConnectorFlyout } from '../application/sections/action_connector_form';
import type { EditConnectorFlyoutProps } from '../application/sections/action_connector_form/edit_connector_flyout';
import type { ConnectorServices } from '../types';

export const getEditConnectorFlyoutLazy = (
  props: EditConnectorFlyoutProps & { connectorServices: ConnectorServices }
) => {
  return (
    <ConnectorProvider
      value={{ services: props.connectorServices, isServerless: !!props.isServerless }}
    >
      <ResponseOpsQueryClientProvider>
        <EditConnectorFlyout {...props} />
      </ResponseOpsQueryClientProvider>
    </ConnectorProvider>
  );
};
