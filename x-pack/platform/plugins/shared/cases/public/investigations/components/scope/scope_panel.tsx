/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  EntityItem,
  EntityScope,
  LinkItem,
  LinkStatus,
} from '../../../../common/investigations/types';
import { useBulkUpdateItems, useInvestigationToasts, useUpdateItem } from '../../hooks';
import { ICONS } from '../../icons';
import { EmptyState, ErrorState, LoadingState, ConfirmModal } from '../shared';
import type { TabProps } from '../tabs/tab_props';
import { AddEntityModal } from './add_entity_modal';
import { AddLinkModal } from './add_link_modal';
import { ScopeInspector } from './scope_inspector';
import { ScopeGraph } from './scope_graph';
import { ScopeLegend } from './scope_legend';
import { ScopeList } from './scope_list';
import { ScopeToolbar } from './scope_toolbar';
import {
  DEFAULT_FILTERS,
  LARGE_SCOPE_ENTITIES,
  MAX_ENTITIES,
  MAX_LINKS,
  findSelectionFromItemId,
  isEntityVisible,
  isInScope,
} from './scope_helpers';
import type { LayoutMode, ScopeFilters, ScopeSelection, ScopeView } from './scope_helpers';
import { isEntityItem, isLinkItem, useAllItems } from './use_all_items';
import { useEntityPositionSaver } from './use_entity_position';
import * as i18n from './translations';

const INSPECTOR_WIDTH = '340px';
/** Below this width the inspector moves under the graph instead of beside it. */
const WIDE_LAYOUT_MIN_WIDTH = 1040;
const BULK_LIMIT = 1000;

export const ScopePanel: React.FC<TabProps> = ({ record, openItemId, onNavigateTab }) => {
  const recordId = record.id;
  const { showSuccess } = useInvestigationToasts();
  const entitiesQuery = useAllItems(recordId, 'entity', isEntityItem, MAX_ENTITIES);
  const linksQuery = useAllItems(recordId, 'link', isLinkItem, MAX_LINKS);
  const updateItem = useUpdateItem(recordId);
  const bulkUpdate = useBulkUpdateItems(recordId);

  const [view, setView] = useState<ScopeView>('graph');
  const [filters, setFilters] = useState<ScopeFilters>(DEFAULT_FILTERS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('saved');
  const [selection, setSelection] = useState<ScopeSelection | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);
  const [addLinkFrom, setAddLinkFrom] = useState<string | null | undefined>(undefined);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const { width: rootWidth } = useResizeObserver(rootElement);
  const isWide = rootWidth >= WIDE_LAYOUT_MIN_WIDTH;

  const entities = useMemo(() => entitiesQuery.data?.items ?? [], [entitiesQuery.data]);
  const links = useMemo(() => linksQuery.data?.items ?? [], [linksQuery.data]);
  const entitiesById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities]
  );
  const saveEntityPosition = useEntityPositionSaver(recordId, entities);
  const handledItemIdRef = useRef<string | undefined>(undefined);
  const isInitialisedRef = useRef(false);

  // A large scope opens on the list, and its graph grouped by type, which stay readable.
  useEffect(() => {
    if (isInitialisedRef.current || entities.length === 0) {
      return;
    }
    isInitialisedRef.current = true;
    if (entities.length > LARGE_SCOPE_ENTITIES) {
      setView('list');
      setLayoutMode('type');
    }
  }, [entities]);

  // Open the node or connection another tab or an activity link points to.
  useEffect(() => {
    if (!openItemId || entities.length === 0 || handledItemIdRef.current === openItemId) {
      return;
    }
    const target = findSelectionFromItemId(openItemId, entities, links);
    if (!target) {
      return;
    }
    handledItemIdRef.current = openItemId;
    setSelection(target);
    const status = target.type === 'node' ? entitiesById.get(target.id)?.status : undefined;
    if (status === 'dismissed' || status === 'external' || status === 'suspected') {
      setFilters((current) => ({
        showDismissed: current.showDismissed || status === 'dismissed',
        showExternal: current.showExternal || status === 'external',
        showSuspected: current.showSuspected || status === 'suspected',
      }));
    }
  }, [openItemId, entities, links, entitiesById]);

  const primary = useMemo(
    () => entities.find((entity) => entity.status === 'primary') ?? entities.find(isInScope),
    [entities]
  );
  const effectiveSelection: ScopeSelection | null =
    selection ?? (primary ? { type: 'node', id: primary.id } : null);

  const inScopeCount = entities.filter(isInScope).length;
  const suspectedCount = entities.filter((entity) => entity.status === 'suspected').length;
  const visibleEntities = useMemo(
    () => entities.filter((entity) => isEntityVisible(entity, filters)),
    [entities, filters]
  );

  const setEntityStatus = useCallback(
    (entity: EntityItem, status: EntityScope) => {
      updateItem.mutate(
        { itemId: entity.id, version: entity.version ?? '', patch: { status } },
        {
          onSuccess: () => {
            const { name } = entity.entity;
            if (status === 'scoped' && entity.status === 'suspected') {
              showSuccess(i18n.ADDED_TO_SCOPE_SUCCESS(name));
            } else if (status === 'dismissed') {
              showSuccess(i18n.DISMISSED_SUCCESS(name));
              setSelection(
                primary && primary.id !== entity.id ? { type: 'node', id: primary.id } : null
              );
            } else {
              showSuccess(i18n.STATUS_CHANGED_SUCCESS(name));
            }
          },
        }
      );
    },
    [updateItem, showSuccess, primary]
  );

  const setLinkStatus = useCallback(
    (link: LinkItem, status: LinkStatus) => {
      updateItem.mutate(
        { itemId: link.id, version: link.version ?? '', patch: { status } },
        {
          onSuccess: () =>
            showSuccess(
              status === 'confirmed' ? i18n.LINK_CONFIRMED_SUCCESS : i18n.LINK_STATUS_SUCCESS
            ),
        }
      );
    },
    [updateItem, showSuccess]
  );

  const resetLayout = () => {
    const positioned = entities.filter((entity) => entity.entity.position);
    for (let start = 0; start < positioned.length; start += BULK_LIMIT) {
      bulkUpdate.mutate(
        {
          items: positioned.slice(start, start + BULK_LIMIT).map((entity) => ({
            id: entity.id,
            version: entity.version,
            patch: { entity: { position: null } },
          })),
        },
        {
          onSuccess: () => {
            showSuccess(i18n.RESET_LAYOUT_SUCCESS);
            setLayoutMode('saved');
            setFitSignal((value) => value + 1);
          },
        }
      );
    }
    setIsResetOpen(false);
  };

  if (entitiesQuery.isLoading || linksQuery.isLoading) {
    return <LoadingState label={i18n.LOADING} />;
  }

  if (entitiesQuery.error || linksQuery.error) {
    return (
      <ErrorState
        title={i18n.LOAD_ERROR}
        error={entitiesQuery.error ?? linksQuery.error}
        onRetry={() => {
          void entitiesQuery.refetch();
          void linksQuery.refetch();
        }}
      />
    );
  }

  const modals = (
    <>
      {isAddEntityOpen ? (
        <AddEntityModal
          recordId={recordId}
          entities={entities}
          onClose={() => setIsAddEntityOpen(false)}
          onCreated={(entity) => setSelection({ type: 'node', id: entity.id })}
        />
      ) : null}
      {addLinkFrom !== undefined ? (
        <AddLinkModal
          recordId={recordId}
          entities={entities}
          initialFromId={addLinkFrom ?? undefined}
          onClose={() => setAddLinkFrom(undefined)}
          onCreated={(link) => setSelection({ type: 'edge', id: link.id })}
        />
      ) : null}
      {isResetOpen ? (
        <ConfirmModal
          title={i18n.RESET_LAYOUT_TITLE}
          body={<p>{i18n.RESET_LAYOUT_BODY}</p>}
          confirmLabel={i18n.RESET_LAYOUT_CONFIRM}
          onConfirm={resetLayout}
          onCancel={() => setIsResetOpen(false)}
          data-test-subj="investigationScopeResetModal"
        />
      ) : null}
    </>
  );

  if (entities.length === 0) {
    return (
      <>
        <EmptyState
          iconType={ICONS.scope}
          title={i18n.EMPTY_TITLE}
          body={i18n.EMPTY_BODY}
          actions={
            <EuiButton
              fill
              iconType={ICONS.add}
              onClick={() => setIsAddEntityOpen(true)}
              data-test-subj="investigationScopeEmptyAdd"
            >
              {i18n.ADD_ENTITY}
            </EuiButton>
          }
          data-test-subj="investigationScopeEmpty"
        />
        {modals}
      </>
    );
  }

  return (
    <div ref={setRootElement} data-test-subj="investigationScopeTab">
      <EuiFlexGroup
        gutterSize="l"
        alignItems="flexStart"
        direction={isWide ? 'row' : 'column'}
        responsive={false}
      >
        <EuiFlexItem
          css={css`
            min-width: 0;
            width: 100%;
          `}
        >
          <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{i18n.SCOPE_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.SCOPE_SUBTITLE}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <ScopeToolbar
              view={view}
              onViewChange={setView}
              filters={filters}
              onFiltersChange={setFilters}
              layoutMode={layoutMode}
              onLayoutModeChange={setLayoutMode}
              inScopeCount={inScopeCount}
              suspectedCount={suspectedCount}
              canAddLink={entities.length >= 2}
              hasSavedPositions={entities.some((entity) => entity.entity.position)}
              onFitView={() => setFitSignal((value) => value + 1)}
              onResetLayout={() => setIsResetOpen(true)}
              onAddEntity={() => setIsAddEntityOpen(true)}
              onAddLink={() => setAddLinkFrom(null)}
            />
            <EuiSpacer size="s" />
            {entitiesQuery.data?.truncated ? (
              <>
                <EuiCallOut
                  size="s"
                  announceOnMount={false}
                  title={i18n.TRUNCATED(entities.length, entitiesQuery.data.total)}
                  data-test-subj="investigationScopeTruncated"
                />
                <EuiSpacer size="s" />
              </>
            ) : null}
            {view === 'graph' ? (
              <>
                <ScopeLegend />
                <EuiSpacer size="s" />
                {visibleEntities.length === 0 ? (
                  <EuiText size="s" color="subdued" data-test-subj="investigationScopeNoVisible">
                    <p>{i18n.NO_MATCH}</p>
                  </EuiText>
                ) : (
                  <ScopeGraph
                    entities={entities}
                    links={links}
                    filters={filters}
                    layoutMode={layoutMode}
                    selection={effectiveSelection}
                    onSelect={setSelection}
                    onMove={saveEntityPosition}
                    fitSignal={fitSignal}
                  />
                )}
              </>
            ) : (
              <ScopeList
                entities={entities}
                filters={filters}
                selectedId={effectiveSelection?.type === 'node' ? effectiveSelection.id : null}
                onSelect={(entityId) => setSelection({ type: 'node', id: entityId })}
                onSetStatus={setEntityStatus}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            width: ${isWide ? INSPECTOR_WIDTH : '100%'};
            flex: 0 0 auto;
          `}
        >
          <ScopeInspector
            recordId={recordId}
            selection={effectiveSelection}
            entities={entities}
            links={links}
            isUpdating={updateItem.isLoading}
            onSelect={setSelection}
            onSetEntityStatus={setEntityStatus}
            onSetLinkStatus={setLinkStatus}
            onAddLinkFrom={(entityId) => setAddLinkFrom(entityId)}
            onNavigateTab={onNavigateTab}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {modals}
    </div>
  );
};
ScopePanel.displayName = 'ScopePanel';
