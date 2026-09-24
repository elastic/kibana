/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { GridLayout } from '@kbn/grid-layout';
import type { GridLayoutData } from '@kbn/grid-layout';
import { A2uiSurface, DataModel, MessageProcessor } from '@kbn/a2ui-renderer';
import type { A2uiMessage, JsonValue, ResolvedActionEvent, Surface } from '@kbn/a2ui-renderer';
import { EuiCallOut, EuiLoadingChart, EuiProgress, EuiText } from '@elastic/eui';
import { customAppCatalog, useCustomAppServices } from '../catalog';
import type { CustomAppDefinition, EsqlQuery } from '../../common/app_definition';
import { ACTION_SET_DATA, GRID_SETTINGS } from '../../common/constants';
import { CustomAppPanel } from './custom_app_panel';
import { useEsqlQueries } from './use_esql_queries';

export interface CustomAppGridProps {
  definition: CustomAppDefinition;
  isEditing: boolean;
  /** When set, only untabbed panels and panels on this tab are rendered. */
  activeTab?: string;
  onLayoutChange: (layout: GridLayoutData) => void;
  onAction: (event: ResolvedActionEvent) => void;
  onEditPanel: (panelId: string) => void;
  onRemovePanel: (panelId: string) => void;
}

/** Distinct tab names, in the order the panels declare them. */
export function getTabs(definition: CustomAppDefinition): string[] {
  const tabs: string[] = [];
  for (const panel of Object.values(definition.panels)) {
    if (panel.tab && !tabs.includes(panel.tab)) tabs.push(panel.tab);
  }
  return tabs;
}

/**
 * Runs a panel's ES|QL queries into its data model, then renders the surface.
 * Query results land in the same data model as static values, so components
 * bind to live data with no special casing.
 */
function PanelSurface({
  surface,
  queries,
  onAction,
}: {
  surface: Surface;
  queries: EsqlQuery[] | undefined;
  onAction: (event: ResolvedActionEvent) => void;
}) {
  const services = useCustomAppServices();
  const { isLoading, errors } = useEsqlQueries({
    queries,
    dataModel: surface.dataModel,
    timeRange: services?.timeRange ?? { from: 'now-7d', to: 'now' },
    search: services?.search as never,
    http: services?.http as never,
  });

  /**
   * Only the very first load replaces the surface with a spinner. Once a filter
   * control can re-run queries, unmounting on every fetch would blank the panel
   * on each keystroke, lose its scroll position, and tear out the anchor of any
   * open popover — so later loads show a progress bar over the live content.
   */
  const hasLoaded = useRef(false);
  if (!isLoading) hasLoaded.current = true;
  const showSpinner = isLoading && !hasLoaded.current && Boolean(queries?.length);

  /**
   * `kbn.setData` is handled here rather than in the shared action handler
   * because it writes to *this* panel's data model — which is what lets a table
   * row action open a modal without any component holding hidden state.
   */
  const handleAction = useCallback(
    (event: ResolvedActionEvent) => {
      if (event.name !== ACTION_SET_DATA) {
        onAction(event);
        return;
      }
      const path = event.context.path;
      if (typeof path !== 'string') return;
      surface.dataModel.set(path, (event.context.value ?? event.context.row ?? null) as JsonValue);
    },
    [onAction, surface]
  );

  return (
    <>
      {errors.length > 0 && (
        <EuiCallOut announceOnMount size="s" color="danger" title="A query failed">
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </EuiCallOut>
      )}
      {showSpinner ? (
        <EuiLoadingChart size="l" />
      ) : (
        <>
          {isLoading && <EuiProgress size="xs" color="primary" position="absolute" />}
          <A2uiSurface
            surface={surface}
            catalog={customAppCatalog}
            onAction={handleAction}
            renderUnknown={(componentType) => (
              <EuiCallOut
                announceOnMount
                size="s"
                color="danger"
                title={`Unknown component "${componentType}"`}
              />
            )}
          />
        </>
      )}
    </>
  );
}

/**
 * Bridges the dashboard grid engine to A2UI: the grid owns where panels sit,
 * and each grid cell hosts exactly one A2UI surface that owns what is inside
 * it. The two never touch each other's state.
 */
export function CustomAppGrid({
  definition,
  isEditing,
  activeTab,
  onLayoutChange,
  onAction,
  onEditPanel,
  onRemovePanel,
}: CustomAppGridProps) {
  // Surfaces are rebuilt only when the stored A2UI messages change, so dragging
  // a panel does not reset the data model a user has been typing into.
  //
  // One data model for the whole app, not one per panel: a filter panel has to be
  // able to drive a query belonging to a chart panel, and a table row action has
  // to be able to open an overlay declared somewhere else. The trade is a single
  // pointer namespace — two panels must not both claim `/selected`.
  const processor = useMemo(() => {
    const next = new MessageProcessor({ sharedDataModel: new DataModel({}) });
    for (const messages of Object.values(definition.surfaces)) {
      next.applyAll(messages as A2uiMessage[]);
    }
    return next;
  }, [definition.surfaces]);

  /**
   * Hidden tabs are filtered out of the layout rather than the rendered output,
   * so the grid never reserves space for them. Panels with no tab stay put —
   * that is what keeps a header or filter panel visible across tabs.
   */
  const visibleLayout = useMemo(() => {
    if (!activeTab) return definition.layout as GridLayoutData;
    const filtered: GridLayoutData = {};
    for (const [id, widget] of Object.entries(definition.layout)) {
      const tab = definition.panels[id]?.tab;
      if (!tab || tab === activeTab) filtered[id] = widget as GridLayoutData[string];
    }
    return filtered;
  }, [definition.layout, definition.panels, activeTab]);

  /**
   * The grid only knows about the visible tab, so it echoes back a layout
   * containing just those panels. Merging over the full layout keeps the
   * hidden tabs' panels from being dropped on the next save.
   *
   * Outside edit mode the echo is ignored entirely: nothing can have moved, and
   * accepting it would mark a freshly opened app as having unsaved changes.
   * The dashboard applies the same guard in `dashboard_grid`.
   */
  const mergeLayoutChange = useCallback(
    (next: GridLayoutData) => {
      if (!isEditing) return;
      onLayoutChange({ ...(definition.layout as GridLayoutData), ...next });
    },
    [definition.layout, isEditing, onLayoutChange]
  );

  return (
    <GridLayout
      layout={visibleLayout}
      gridSettings={GRID_SETTINGS}
      accessMode={isEditing ? 'EDIT' : 'VIEW'}
      onLayoutChange={mergeLayoutChange}
      useCustomDragHandle
      renderPanelContents={(panelId, setDragHandles) => {
        const surface = processor.getSurface(panelId);
        return (
          <CustomAppPanel
            title={definition.panels[panelId]?.title}
            hideBorder={definition.panels[panelId]?.hideBorder}
            isEditing={isEditing}
            setDragHandles={setDragHandles}
            onEdit={() => onEditPanel(panelId)}
            onRemove={() => onRemovePanel(panelId)}
          >
            {surface ? (
              <PanelSurface
                surface={surface}
                queries={definition.queries?.[panelId]}
                onAction={onAction}
              />
            ) : (
              <EuiText size="s" color="subdued">
                <p>This panel has no content yet.</p>
              </EuiText>
            )}
          </CustomAppPanel>
        );
      }}
    />
  );
}
