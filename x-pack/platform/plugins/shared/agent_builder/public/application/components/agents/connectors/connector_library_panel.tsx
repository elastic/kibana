/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { appPaths } from '../../../utils/app_paths';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

export interface ConnectorLibraryConnector {
  id: string;
  name: string;
  actionTypeId: string;
}

type ConnectorLibraryItem<T extends ConnectorLibraryConnector> = T & { description: string };

const libraryLabels: LibraryPanelLabels = {
  title: labels.agentConnectors.addConnectorFromLibraryTitle,
  manageLibraryLink: labels.agentConnectors.manageConnectorLibraryLink,
  searchPlaceholder: labels.agentConnectors.searchAvailableConnectorsPlaceholder,
  availableSummary: (showing, total) => (
    <FormattedMessage
      id="xpack.agentBuilder.agentConnectors.library.availableSummary"
      defaultMessage="Showing <bold>1-{showing}</bold> of {total} <bold>{total, plural, one {Connector} other {Connectors}}</bold>"
      values={{ showing, total, bold: (chunks) => <strong>{chunks}</strong> }}
    />
  ),
  noMatchMessage: labels.agentConnectors.noAvailableConnectorsMatchMessage,
  noItemsMessage: labels.agentConnectors.noAvailableConnectorsMessage,
};

const getConnectorName = (item: ConnectorLibraryConnector): string => item.name;

export interface ConnectorLibraryPanelProps<T extends ConnectorLibraryConnector> {
  onClose: () => void;
  allConnectors: readonly T[];
  activeConnectorIdSet: Set<string>;
  onToggle: (connector: T, isActive: boolean) => void;
  actionTypeRegistry?: ActionTypeRegistryContract;
}

export const ConnectorLibraryPanel = <T extends ConnectorLibraryConnector>({
  onClose,
  allConnectors,
  activeConnectorIdSet,
  onToggle,
  actionTypeRegistry,
}: ConnectorLibraryPanelProps<T>) => {
  const { plugins } = useKibana().services;
  const registry = actionTypeRegistry ?? plugins?.triggersActionsUi.actionTypeRegistry;

  const items = useMemo<Array<ConnectorLibraryItem<T>>>(
    () =>
      allConnectors.map((c) => ({
        ...c,
        description: registry?.has(c.actionTypeId)
          ? registry.get(c.actionTypeId).actionTypeTitle ?? c.actionTypeId
          : c.actionTypeId,
      })),
    [allConnectors, registry]
  );

  return (
    <LibraryPanel<ConnectorLibraryItem<T>>
      onClose={onClose}
      allItems={items}
      activeItemIdSet={activeConnectorIdSet}
      onToggleItem={(item, isActive) => onToggle(item, isActive)}
      flyoutTitleId="connectorLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.manage.connectors}
      getItemName={getConnectorName}
      dataTestSubj="agentConnectorLibraryFlyout"
    />
  );
};
