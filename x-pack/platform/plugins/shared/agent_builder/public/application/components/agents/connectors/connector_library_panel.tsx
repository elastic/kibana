/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { appPaths } from '../../../utils/app_paths';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

type ConnectorLibraryItem = ConnectorItem & { description: string };

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

const getConnectorName = (item: ConnectorLibraryItem): string => item.name;

interface ConnectorLibraryPanelProps {
  onClose: () => void;
  allConnectors: readonly ConnectorItem[];
  activeConnectorIdSet: Set<string>;
  onToggle: (connector: ConnectorItem, isActive: boolean) => void;
}

export const ConnectorLibraryPanel: React.FC<ConnectorLibraryPanelProps> = ({
  onClose,
  allConnectors,
  activeConnectorIdSet,
  onToggle,
}) => {
  const { actionTypeRegistry } = useKibana().services.plugins.triggersActionsUi;

  const items = useMemo<ConnectorLibraryItem[]>(
    () =>
      allConnectors.map((c) => ({
        ...c,
        description: actionTypeRegistry.has(c.actionTypeId)
          ? actionTypeRegistry.get(c.actionTypeId).actionTypeTitle ?? c.actionTypeId
          : c.actionTypeId,
      })),
    [allConnectors, actionTypeRegistry]
  );

  return (
    <LibraryPanel<ConnectorLibraryItem>
      onClose={onClose}
      allItems={items}
      activeItemIdSet={activeConnectorIdSet}
      onToggleItem={(item, isActive) => onToggle(item, isActive)}
      flyoutTitleId="connectorLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.manage.connectors}
      getItemName={getConnectorName}
    />
  );
};
