/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { LibraryPanel } from '../common/library_panel';
import type { LibraryPanelLabels } from '../common/library_panel';

const libraryLabels: LibraryPanelLabels = {
  title: labels.agentTools.addToolFromLibraryTitle,
  manageLibraryLink: labels.agentTools.manageToolLibraryLink,
  searchPlaceholder: labels.agentTools.searchAvailableToolsPlaceholder,
  availableSummary: (showing, total) => (
    <FormattedMessage
      id="xpack.agentBuilder.agentTools.availableToolsSummary"
      defaultMessage="Showing <bold>1-{showing}</bold> of {total} <bold>{total, plural, one {Tool} other {Tools}}</bold>"
      values={{
        showing,
        total,
        bold: (chunks) => <strong>{chunks}</strong>,
      }}
    />
  ),
  noMatchMessage: labels.agentTools.noAvailableToolsMatchMessage,
  noItemsMessage: labels.agentTools.noAvailableToolsMessage,
  disabledBadgeLabel: labels.agentTools.autoIncludedBadgeLabel,
  disabledTooltipTitle: labels.agentTools.autoIncludedTooltipTitle,
  disabledTooltipBody: labels.agentTools.autoIncludedTooltipBody,
};

interface ToolLibraryPanelProps {
  onClose: () => void;
  allTools: ToolDefinition[];
  activeToolIdSet: Set<string>;
  onToggleTool: (tool: ToolDefinition, isActive: boolean) => void;
  mutatingToolId: string | null;
  enableElasticCapabilities?: boolean;
  builtinToolIdSet?: Set<string>;
}

export const ToolLibraryPanel: React.FC<ToolLibraryPanelProps> = ({
  onClose,
  allTools,
  activeToolIdSet,
  onToggleTool,
  mutatingToolId,
  enableElasticCapabilities = false,
  builtinToolIdSet,
}) => {
  const disabledItemIdSet = useMemo(() => {
    if (!enableElasticCapabilities || !builtinToolIdSet) return undefined;
    return builtinToolIdSet;
  }, [enableElasticCapabilities, builtinToolIdSet]);

  const readOnlyItemIdSet = useMemo(
    () => new Set(allTools.filter((t) => t.readonly).map((t) => t.id)),
    [allTools]
  );

  return (
    <LibraryPanel<ToolDefinition>
      onClose={onClose}
      allItems={allTools}
      activeItemIdSet={activeToolIdSet}
      onToggleItem={onToggleTool}
      mutatingItemId={mutatingToolId}
      flyoutTitleId="toolLibraryFlyoutTitle"
      libraryLabels={libraryLabels}
      manageLibraryPath={appPaths.tools.list}
      disabledItemIdSet={disabledItemIdSet}
      readOnlyItemIdSet={readOnlyItemIdSet}
    />
  );
};
