/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type {
  MemoryCategoryNode,
  MemoryStatusResponse,
  MemoryUnavailableReason,
} from '@kbn/agent-memory-common';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import {
  useMemoryCategories,
  useMemoryMaintenance,
  useMemorySearch,
  useMemoryStatus,
  useSetUpMemory,
} from '../../hooks/use_memory';
import { MemoryEntryFlyout } from './memory_entry_flyout';
import { MemoryMaintenancePanel } from './memory_maintenance_panel';
import { MemoryPageTable, type MemoryPageRow } from './memory_page_table';
import { MemorySetupPrompt } from './memory_setup_prompt';

/** Searching starts at two characters, matching how the tree browse behaves. */
const MIN_SEARCH_LENGTH = 2;

const KNOWN_STATES: readonly string[] = [
  'unavailable',
  'not_installed',
  'installing',
  'partially_ready',
  'ready',
];

/**
 * A response we cannot interpret is treated as unavailable rather than rendered
 * optimistically: memory is one section of a shared page, and it must not be able
 * to take the rest of the page down with it.
 */
const isUsableStatus = (status: MemoryStatusResponse | undefined): boolean =>
  Boolean(status && KNOWN_STATES.includes(status.state) && status.maintenance && status.storage);

const UNAVAILABLE_COPY: Record<MemoryUnavailableReason, string> = {
  plugin_disabled: i18n.translate('xpack.contextEngine.memory.unavailable.disabled', {
    defaultMessage:
      'Agent memory is not enabled in this deployment. An administrator can enable it with xpack.agentMemory.enabled.',
  }),
  workflows_unavailable: i18n.translate('xpack.contextEngine.memory.unavailable.workflows', {
    defaultMessage:
      'Background curation is unavailable because workflows are not enabled in this deployment. Memory pages can still be read and written.',
  }),
  license: i18n.translate('xpack.contextEngine.memory.unavailable.license', {
    defaultMessage: 'Agent memory requires an Enterprise license.',
  }),
};

/** Flattens the category tree into one row per page, de-duplicated across categories. */
const flattenTree = (
  tree: MemoryCategoryNode[],
  uncategorized: Array<{ id: string; name: string; title: string }>
): MemoryPageRow[] => {
  const byId = new Map<string, MemoryPageRow>();

  const walk = (nodes: MemoryCategoryNode[]) => {
    for (const node of nodes) {
      for (const page of node.pages) {
        const existing = byId.get(page.id);
        if (existing) {
          existing.categories.push(node.category);
        } else {
          byId.set(page.id, { ...page, categories: [node.category] });
        }
      }
      walk(node.children);
    }
  };
  walk(tree);

  for (const page of uncategorized) {
    if (!byId.has(page.id)) {
      byId.set(page.id, { ...page, categories: [] });
    }
  }

  return [...byId.values()].sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
};

export const MemorySection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>();

  const { data: status, isLoading: isStatusLoading } = useMemoryStatus();
  const { setUp, isSettingUp } = useSetUpMemory();
  const maintenance = useMemoryMaintenance();

  const isBrowsable = status?.state === 'ready' || status?.state === 'partially_ready';
  const isSearching = searchQuery.trim().length >= MIN_SEARCH_LENGTH;

  const { data: categories, isLoading: areCategoriesLoading } = useMemoryCategories({
    enabled: Boolean(isBrowsable) && !isSearching,
  });
  const { data: searchResults, isLoading: isSearchLoading } = useMemorySearch({
    query: searchQuery.trim(),
    enabled: Boolean(isBrowsable) && isSearching,
  });

  const rows = useMemo<MemoryPageRow[]>(() => {
    if (isSearching) {
      return (searchResults?.results ?? []).map((result) => ({
        id: result.id,
        name: result.name,
        title: result.title,
        categories: result.categories,
      }));
    }
    return flattenTree(categories?.tree ?? [], categories?.uncategorized ?? []);
  }, [isSearching, searchResults, categories]);

  const canManage = status?.capabilities?.canManage ?? false;

  // The table carries metadata only; the flyout loads the page itself.
  const handleSelect = useCallback((row: MemoryPageRow) => setSelectedEntryId(row.id), []);

  const header = (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.memory.sectionTitle', { defaultMessage: 'Memory' })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.contextEngine.memory.sectionDescription', {
          defaultMessage:
            'A shared knowledge base your agents read from and write to. Enable it per agent from the agent’s settings.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );

  if (isStatusLoading) {
    return (
      <div data-test-subj="contextMemorySection">
        {header}
        <EuiSkeletonText lines={3} data-test-subj="contextMemoryLoading" />
      </div>
    );
  }

  if (!isUsableStatus(status) || status?.state === 'unavailable') {
    return (
      <div data-test-subj="contextMemorySection">
        {header}
        <EuiEmptyPrompt
          data-test-subj="contextMemoryUnavailable"
          iconType="warning"
          titleSize="xs"
          title={
            <h4>
              {i18n.translate('xpack.contextEngine.memory.unavailableTitle', {
                defaultMessage: 'Memory isn’t available',
              })}
            </h4>
          }
          body={<EuiText size="s">{UNAVAILABLE_COPY[status?.reason ?? 'plugin_disabled']}</EuiText>}
        />
      </div>
    );
  }

  if (status!.state === 'not_installed') {
    return (
      <div data-test-subj="contextMemorySection">
        {header}
        <MemorySetupPrompt
          canManage={canManage}
          isSettingUp={isSettingUp}
          onSetUp={() => void setUp()}
        />
      </div>
    );
  }

  if (status!.state === 'installing') {
    return (
      <div data-test-subj="contextMemorySection">
        {header}
        <EuiEmptyPrompt
          data-test-subj="contextMemorySetupInProgress"
          icon={<EuiLoadingSpinner size="xl" />}
          titleSize="xs"
          title={
            <h4>
              {i18n.translate('xpack.contextEngine.memory.installingTitle', {
                defaultMessage: 'Setting up memory…',
              })}
            </h4>
          }
          body={
            <EuiText size="s">
              {i18n.translate('xpack.contextEngine.memory.installingBody', {
                defaultMessage: 'This usually takes a few seconds.',
              })}
            </EuiText>
          }
        />
      </div>
    );
  }

  return (
    <div data-test-subj="contextMemorySection">
      {header}

      {status!.state === 'partially_ready' && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="contextMemoryMaintenanceCallout"
            title={
              status!.maintenance.workflows.some((w) => !w.installed)
                ? i18n.translate('xpack.contextEngine.memory.partiallyReadyNotInstalledTitle', {
                    defaultMessage: 'Some background curation jobs are not installed',
                  })
                : i18n.translate('xpack.contextEngine.memory.partiallyReadyTitle', {
                    defaultMessage: 'Some background curation jobs are off',
                  })
            }
          >
            <EuiText size="s">
              {i18n.translate('xpack.contextEngine.memory.partiallyReadyBody', {
                defaultMessage:
                  'Agents can still read and write memory. Turn the jobs on below to keep the knowledge base curated automatically.',
              })}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={i18n.translate('xpack.contextEngine.memory.searchPlaceholder', {
              defaultMessage: 'Search memory pages',
            })}
            data-test-subj="contextMemorySearch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <MemoryPageTable
        rows={rows}
        isLoading={isSearching ? isSearchLoading : areCategoriesLoading}
        onSelect={handleSelect}
        emptyMessage={
          isSearching
            ? i18n.translate('xpack.contextEngine.memory.noSearchResults', {
                defaultMessage: 'No memory pages match your search',
              })
            : i18n.translate('xpack.contextEngine.memory.noPages', {
                defaultMessage: 'No memory pages yet — your agents will add them as they learn',
              })
        }
      />

      <EuiSpacer size="l" />

      <MemoryMaintenancePanel
        workflows={status!.maintenance.workflows}
        canManage={canManage}
        isUpdating={maintenance.setAllEnabled.isLoading || maintenance.setWorkflowEnabled.isLoading}
        onToggleAll={(enabled) => maintenance.setAllEnabled.mutate({ enabled })}
        onToggleWorkflow={(type, enabled) =>
          maintenance.setWorkflowEnabled.mutate({ type, enabled })
        }
        onRunWorkflow={(type) => maintenance.runWorkflow.mutate({ type })}
      />

      {selectedEntryId && (
        <MemoryEntryFlyout
          entryId={selectedEntryId}
          canManage={canManage}
          onClose={() => setSelectedEntryId(undefined)}
        />
      )}
    </div>
  );
};
