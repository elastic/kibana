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
  /**
   * Built once for the whole app, so every panel shares one data model. Two
   * grids render an app — persistent and tabbed — and they must not each build
   * their own, or a control above the tabs could not drive a panel below them.
   */
  processor: MessageProcessor;
  isEditing: boolean;
  /**
   * 'persistent' draws the untabbed panels, which sit above the tab bar because
   * they apply to every tab; 'tab' draws the panels belonging to `activeTab`.
   */
  scope: 'persistent' | 'tab';
  activeTab?: string;
  onLayoutChange: (layout: GridLayoutData) => void;
  onAction: (event: ResolvedActionEvent) => void;
  onEditPanel: (panelId: string) => void;
  onRemovePanel: (panelId: string) => void;
}

/**
 * Replays an app's stored A2UI messages into surfaces that share one data model.
 * Lifted out of the grid so the page can own it: the two grids that draw an app
 * have to read and write the same model.
 */
export function useAppSurfaces(definition: CustomAppDefinition): MessageProcessor {
  // Rebuilt only when the stored messages change, so dragging a panel does not
  // reset a data model the user has been typing into.
  return useMemo(() => {
    const next = new MessageProcessor({ sharedDataModel: new DataModel({}) });
    for (const messages of Object.values(definition.surfaces)) {
      next.applyAll(messages as A2uiMessage[]);
    }
    return next;
  }, [definition.surfaces]);
}

/** The first row a tab's panels may occupy, just below the persistent ones. */
export function persistentDepth(definition: CustomAppDefinition): number {
  let depth = 0;
  for (const [id, widget] of Object.entries(definition.layout)) {
    if (definition.panels[id]?.tab) continue;
    if (widget.type === 'panel') depth = Math.max(depth, widget.row + widget.height);
  }
  return depth;
}

/** True when a panel belongs to the grid this scope draws. */
function inScope(
  definition: CustomAppDefinition,
  id: string,
  scope: 'persistent' | 'tab',
  activeTab: string | undefined
): boolean {
  const tab = definition.panels[id]?.tab;
  return scope === 'persistent' ? !tab : Boolean(tab) && tab === activeTab;
}

/**
 * How far to shift a scope's rows so its own grid starts at row 0.
 *
 * Measured from the scope's *own* topmost panel rather than from where the
 * persistent panels end. The two must not be coupled: deriving a tab's offset
 * from the header's depth meant anything that grew the header — adding a panel
 * to it, say — shifted every tab panel above row 0, where they clamped together
 * and the grid fought the echo in an endless loop.
 */
export function scopeOffset(
  definition: CustomAppDefinition,
  scope: 'persistent' | 'tab',
  activeTab: string | undefined
): number {
  let top = Infinity;
  for (const [id, widget] of Object.entries(definition.layout)) {
    if (inScope(definition, id, scope, activeTab)) top = Math.min(top, widget.row);
  }
  return Number.isFinite(top) ? top : 0;
}

/**
 * The panels one grid draws, with their rows rebased to that grid's origin.
 *
 * Tabbed panels are stored below the persistent ones so the saved document reads
 * as one page, but their own grid starts at row 0 — otherwise it would open with
 * a band of empty rows where the header used to be.
 */
export function scopedLayout(
  definition: CustomAppDefinition,
  scope: 'persistent' | 'tab',
  activeTab: string | undefined,
  offset: number
): GridLayoutData {
  const filtered: GridLayoutData = {};
  for (const [id, widget] of Object.entries(definition.layout)) {
    if (!inScope(definition, id, scope, activeTab)) continue;
    // `offset` is the scope's smallest row, so this can never go negative and
    // never needs a clamp — which is what kept the round trip lossless.
    filtered[id] =
      offset === 0
        ? (widget as GridLayoutData[string])
        : ({ ...widget, row: widget.row - offset } as GridLayoutData[string]);
  }
  return filtered;
}

/** Undoes `scopedLayout`'s rebasing, so the stored geometry stays absolute. */
export function rebaseLayout(layout: GridLayoutData, offset: number): GridLayoutData {
  if (offset === 0) return layout;
  const restored: GridLayoutData = {};
  for (const [id, widget] of Object.entries(layout)) {
    restored[id] = { ...widget, row: widget.row + offset } as GridLayoutData[string];
  }
  return restored;
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
  processor,
  isEditing,
  scope,
  activeTab,
  onLayoutChange,
  onAction,
  onEditPanel,
  onRemovePanel,
}: CustomAppGridProps) {
  // Tabbed panels are laid out below the persistent ones in the stored document,
  // but their grid starts at row 0, so they are shifted up on the way in and back
  // down on the way out. That keeps the saved geometry readable as one page.
  const offset = useMemo(
    () => scopeOffset(definition, scope, activeTab),
    [definition, scope, activeTab]
  );

  const visibleLayout = useMemo(
    () => scopedLayout(definition, scope, activeTab, offset),
    [definition, scope, activeTab, offset]
  );

  /**
   * The grid only knows about the panels it was given, so it echoes back a layout
   * containing just those. Merging over the full layout keeps the other tabs'
   * panels — and the other grid's — from being dropped on the next save.
   *
   * Outside edit mode the echo is ignored entirely: nothing can have moved, and
   * accepting it would mark a freshly opened app as having unsaved changes.
   * The dashboard applies the same guard in `dashboard_grid`.
   */
  const mergeLayoutChange = useCallback(
    (next: GridLayoutData) => {
      if (!isEditing) return;
      onLayoutChange({
        ...(definition.layout as GridLayoutData),
        ...rebaseLayout(next, offset),
      });
    },
    [definition.layout, isEditing, offset, onLayoutChange]
  );

  if (Object.keys(visibleLayout).length === 0) return null;

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
