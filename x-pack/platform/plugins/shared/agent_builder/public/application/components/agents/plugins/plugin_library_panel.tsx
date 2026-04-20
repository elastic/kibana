/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

const libraryLabels: LibraryPanelLabels = {
  title: labels.agentPlugins.addPluginFromLibraryTitle,
  manageLibraryLink: labels.agentPlugins.managePluginLibraryLink,
  searchPlaceholder: labels.agentPlugins.searchAvailablePluginsPlaceholder,
  availableSummary: (showing, total) => (
    <FormattedMessage
      id="xpack.agentBuilder.agentPlugins.availablePluginsSummary"
      defaultMessage="Showing <bold>1-{showing}</bold> of {total} <bold>{total, plural, one {Plugin} other {Plugins}}</bold>"
      values={{
        showing,
        total,
        bold: (chunks) => <strong>{chunks}</strong>,
      }}
    />
  ),
  noMatchMessage: labels.agentPlugins.noAvailablePluginsMatchMessage,
  noItemsMessage: labels.agentPlugins.noAvailablePluginsMessage,
  disabledBadgeLabel: labels.agentPlugins.autoIncludedBadgeLabel,
  disabledTooltipTitle: labels.agentPlugins.autoIncludedTooltipTitle,
  disabledTooltipBody: labels.agentPlugins.autoIncludedTooltipBody,
};

const getPluginName = (plugin: PluginDefinition): string => plugin.name;

interface PluginLibraryPanelProps {
  onClose: () => void;
  allPlugins: PluginDefinition[];
  activePluginIdSet: Set<string>;
  onTogglePlugin: (plugin: PluginDefinition, isActive: boolean) => void;
  mutatingPluginId: string | null;
  autoPluginIdSet?: Set<string>;
}

export const PluginLibraryPanel: React.FC<PluginLibraryPanelProps> = ({
  onClose,
  allPlugins,
  activePluginIdSet,
  onTogglePlugin,
  mutatingPluginId,
  autoPluginIdSet,
}) => {
  const readOnlyItemIdSet = useMemo(
    () => new Set(allPlugins.filter((p) => p.readonly).map((p) => p.id)),
    [allPlugins]
  );

  return (
    <LibraryPanel<PluginDefinition>
      onClose={onClose}
      allItems={allPlugins}
      activeItemIdSet={activePluginIdSet}
      onToggleItem={onTogglePlugin}
      mutatingItemId={mutatingPluginId}
      flyoutTitleId="pluginLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.plugins.list}
      getItemName={getPluginName}
      disabledItemIdSet={autoPluginIdSet}
      readOnlyItemIdSet={readOnlyItemIdSet}
    />
  );
};
