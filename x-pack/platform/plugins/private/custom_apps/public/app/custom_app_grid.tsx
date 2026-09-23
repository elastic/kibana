/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { GridLayout } from '@kbn/grid-layout';
import type { GridLayoutData } from '@kbn/grid-layout';
import { A2uiSurface, MessageProcessor } from '@kbn/a2ui-renderer';
import type { A2uiMessage, ResolvedActionEvent, Surface } from '@kbn/a2ui-renderer';
import { EuiCallOut, EuiLoadingChart, EuiText } from '@elastic/eui';
import { customAppCatalog, useCustomAppServices } from '../catalog';
import type { CustomAppDefinition, EsqlQuery } from '../../common/app_definition';
import { GRID_SETTINGS } from '../../common/constants';
import { CustomAppPanel } from './custom_app_panel';
import { useEsqlQueries } from './use_esql_queries';

export interface CustomAppGridProps {
  definition: CustomAppDefinition;
  isEditing: boolean;
  onLayoutChange: (layout: GridLayoutData) => void;
  onAction: (event: ResolvedActionEvent) => void;
  onEditPanel: (panelId: string) => void;
  onRemovePanel: (panelId: string) => void;
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
      {isLoading && queries?.length ? (
        <EuiLoadingChart size="l" />
      ) : (
        <A2uiSurface
          surface={surface}
          catalog={customAppCatalog}
          onAction={onAction}
          renderUnknown={(componentType) => (
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              title={`Unknown component "${componentType}"`}
            />
          )}
        />
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
  onLayoutChange,
  onAction,
  onEditPanel,
  onRemovePanel,
}: CustomAppGridProps) {
  // Surfaces are rebuilt only when the stored A2UI messages change, so dragging
  // a panel does not reset the data model a user has been typing into.
  const processor = useMemo(() => {
    const next = new MessageProcessor();
    for (const messages of Object.values(definition.surfaces)) {
      next.applyAll(messages as A2uiMessage[]);
    }
    return next;
  }, [definition.surfaces]);

  return (
    <GridLayout
      layout={definition.layout as GridLayoutData}
      gridSettings={GRID_SETTINGS}
      accessMode={isEditing ? 'EDIT' : 'VIEW'}
      onLayoutChange={onLayoutChange}
      useCustomDragHandle
      renderPanelContents={(panelId, setDragHandles) => {
        const surface = processor.getSurface(panelId);
        return (
          <CustomAppPanel
            title={definition.panels[panelId]?.title}
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
