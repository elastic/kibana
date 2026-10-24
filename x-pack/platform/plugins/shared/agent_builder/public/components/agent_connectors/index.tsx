/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type {
  ConnectorLibraryConnector,
  ConnectorLibraryPanelProps,
} from '../../application/components/agents/connectors/connector_library_panel';

export type { ConnectorsCustomizeEmptyStateProps } from '../../application/components/agents/connectors/connectors_customize_empty_state';
export type { AddConnectorMenuProps } from '../../application/components/agents/connectors/add_connector_menu';
export type {
  ConnectorLibraryConnector,
  ConnectorLibraryPanelProps,
} from '../../application/components/agents/connectors/connector_library_panel';

export const ConnectorsCustomizeEmptyState = dynamic(() =>
  import('../../application/components/agents/connectors/connectors_customize_empty_state').then(
    (m) => ({ default: m.ConnectorsCustomizeEmptyState })
  )
);

export const AddConnectorMenu = dynamic(() =>
  import('../../application/components/agents/connectors/add_connector_menu').then((m) => ({
    default: m.AddConnectorMenu,
  }))
);

const LazyConnectorLibraryPanel = dynamic(() =>
  import('../../application/components/agents/connectors/connector_library_panel').then((m) => ({
    default: m.ConnectorLibraryPanel as React.ComponentType<
      ConnectorLibraryPanelProps<ConnectorLibraryConnector>
    >,
  }))
);

export const ConnectorLibraryPanel = <T extends ConnectorLibraryConnector>(
  props: ConnectorLibraryPanelProps<T>
) => (
  <LazyConnectorLibraryPanel
    {...(props as unknown as ConnectorLibraryPanelProps<ConnectorLibraryConnector>)}
  />
);
