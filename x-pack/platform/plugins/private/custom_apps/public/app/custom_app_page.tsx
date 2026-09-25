/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { isLayoutEqual } from '@kbn/grid-layout';
import type { GridLayoutData } from '@kbn/grid-layout';
import type { A2uiMessage } from '@kbn/a2ui-renderer';
import { CustomAppServicesProvider } from '../catalog';
import { SampleDataCallout } from './sample_data_callout';
import type { CustomAppDefinition } from '../../common/app_definition';
import { emptyAppDefinition } from '../../common/app_definition';
import { PLUGIN_NAME } from '../../common/constants';
import type { CustomAppClient } from './custom_app_client';
import { CustomAppGrid, getTabs, useAppSurfaces } from './custom_app_grid';
import { PanelEditorFlyout } from './panel_editor_flyout';
import { AppEditorFlyout } from './app_editor_flyout';
import { createActionHandler } from './handle_action';
import { addPanelTo, applyPanelEdit } from './panel_mutations';

/** Stands in before the app loads, so the surfaces hook keeps a stable identity. */
const EMPTY_DEFINITION = emptyAppDefinition('');

export interface CustomAppPageProps {
  core: CoreStart;
  data: DataPublicPluginStart;
  client: CustomAppClient;
  appId: string;
  /**
   * False when the reader opened the app from the side navigation, which is a
   * read-only route. The edit affordances are hidden entirely rather than
   * disabled, so a read-only view has no dead controls in it.
   */
  canEdit: boolean;
  onNavigateToList: () => void;
  /** Saving may change whether this app appears in the navigation. */
  onAppsChanged: () => void;
}

export function CustomAppPage({
  core,
  data,
  client,
  appId,
  canEdit,
  onNavigateToList,
  onAppsChanged,
}: CustomAppPageProps) {
  const [saved, setSaved] = useState<CustomAppDefinition | undefined>();
  const [definition, setDefinition] = useState<CustomAppDefinition | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState<string | undefined>();
  const [isAppEditorOpen, setIsAppEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>();
  const [loadError, setLoadError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  // One time range for the whole page; every chart panel reads it from context.
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-7d', to: 'now' });

  useEffect(() => {
    let cancelled = false;
    client
      .get(appId)
      .then((stored) => {
        if (cancelled) return;
        setSaved(stored.definition);
        setDefinition(stored.definition);
      })
      .catch((error) => !cancelled && setLoadError(error.body?.message ?? error.message));
    return () => {
      cancelled = true;
    };
  }, [client, appId]);

  // The header no longer shows the title, so the breadcrumb carries it — and
  // doubles as the way back to the listing, which is why there is no longer an
  // "All apps" button competing with it.
  useEffect(() => {
    if (!definition?.title) return;
    core.chrome.docTitle.change(definition.title);
    core.chrome.setBreadcrumbs([
      {
        text: PLUGIN_NAME,
        onClick: (event) => {
          event.preventDefault();
          onNavigateToList();
        },
      },
      { text: definition.title },
    ]);
  }, [core, definition?.title, onNavigateToList]);

  const onAction = useMemo(
    () =>
      createActionHandler({
        application: core.application,
        notifications: core.notifications,
      }),
    [core]
  );

  const tabs = useMemo(() => (definition ? getTabs(definition) : []), [definition]);

  // One processor, so both grids share a data model.
  const processor = useAppSurfaces(definition ?? EMPTY_DEFINITION);

  // An app can gain or lose tabs through the editor, so fall back to the first
  // one rather than leaving the grid filtered to a tab that no longer exists.
  useEffect(() => {
    if (tabs.length === 0) setActiveTab(undefined);
    else if (!activeTab || !tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [tabs, activeTab]);

  const hasUnsavedChanges = useMemo(
    () => Boolean(definition && saved && JSON.stringify(definition) !== JSON.stringify(saved)),
    [definition, saved]
  );

  const save = useCallback(async () => {
    if (!definition) return;
    setIsSaving(true);
    try {
      await client.update(appId, definition);
      setSaved(definition);
      onAppsChanged();
      core.notifications.toasts.addSuccess('Custom app saved');
    } catch (error) {
      core.notifications.toasts.addDanger({
        title: 'Could not save',
        text: error.body?.message ?? error.message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [client, appId, definition, core, onAppsChanged]);

  /**
   * `GridLayout` echoes its layout back on every render, so writing it into
   * state unconditionally is an infinite render loop. Bail out when nothing
   * actually moved — the same guard the dashboard applies in `dashboard_grid`.
   */
  const onLayoutChange = useCallback((layout: GridLayoutData) => {
    setDefinition((current) => {
      if (!current) return current;
      if (isLayoutEqual(current.layout as GridLayoutData, layout)) return current;
      return { ...current, layout: layout as CustomAppDefinition['layout'] };
    });
  }, []);

  const addPanel = useCallback(() => {
    setDefinition((current) => (current ? addPanelTo(current, activeTab) : current));
  }, [activeTab]);

  const removePanel = useCallback((panelId: string) => {
    setDefinition((current) => {
      if (!current) return current;
      const { [panelId]: _removedLayout, ...layout } = current.layout;
      const { [panelId]: _removedPanel, ...panels } = current.panels;
      const { [panelId]: _removedSurface, ...surfaces } = current.surfaces;
      return { ...current, layout, panels, surfaces };
    });
  }, []);

  if (loadError) {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.EmptyPrompt color="danger" title={<h2>Could not load this app</h2>}>
          <p>{loadError}</p>
          <EuiButton onClick={onNavigateToList}>Back to list</EuiButton>
        </EuiPageTemplate.EmptyPrompt>
      </EuiPageTemplate>
    );
  }

  if (!definition) {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.EmptyPrompt title={<EuiLoadingSpinner size="l" />} body={null} />
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate grow offset={0}>
      {/*
        No title, description or time picker here — those are panels inside the
        app so they can be edited like any other content. The bar carries only
        the actions that operate *on* the app.
      */}
      {canEdit && (
        <EuiPageTemplate.Header
          paddingSize="s"
          rightSideItems={[
            isEditing ? (
              <EuiButton
                key="save"
                fill
                iconType="save"
                isLoading={isSaving}
                isDisabled={!hasUnsavedChanges}
                onClick={save}
              >
                Save
              </EuiButton>
            ) : (
              <EuiButton key="edit" iconType="pencil" onClick={() => setIsEditing(true)}>
                Edit
              </EuiButton>
            ),
            isEditing ? (
              <EuiButton key="add" iconType="plusInCircle" onClick={addPanel}>
                Add panel
              </EuiButton>
            ) : null,
            isEditing ? (
              <EuiButtonEmpty
                key="settings"
                iconType="gear"
                onClick={() => setIsAppEditorOpen(true)}
              >
                Settings
              </EuiButtonEmpty>
            ) : null,
            isEditing ? (
              <EuiButtonEmpty
                key="done"
                onClick={() => {
                  setDefinition(saved);
                  setIsEditing(false);
                }}
              >
                Cancel
              </EuiButtonEmpty>
            ) : null,
          ].filter(Boolean)}
        />
      )}

      <EuiPageTemplate.Section grow>
        {hasUnsavedChanges && (
          <EuiCallOut announceOnMount size="s" color="warning" title="You have unsaved changes" />
        )}

        <SampleDataCallout core={core} />

        <CustomAppServicesProvider
          services={{
            timeRange,
            setTimeRange,
            search: data.search.search,
            http: core.http,
            uiSettings: core.uiSettings,
          }}
        >
          {/*
            Untabbed panels are drawn above the tab bar, not below it. They hold
            the things that apply to every tab — the title, the time picker, the
            filters — so putting them under the tabs implied they belonged to
            whichever tab happened to be open.
          */}
          {/*
            `flex: none` matters: the grid's own wrapper is `height: 100%`, so in
            the page section's flex column it would otherwise stretch and push the
            tab bar to the bottom of the viewport.
          */}
          <div css={{ flex: 'none' }}>
            <CustomAppGrid
              definition={definition}
              processor={processor}
              isEditing={isEditing}
              scope="persistent"
              onLayoutChange={onLayoutChange}
              onAction={onAction}
              onEditPanel={setEditingPanelId}
              onRemovePanel={removePanel}
            />
          </div>

          {tabs.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiTabs>
                {tabs.map((tab) => (
                  <EuiTab
                    key={tab}
                    isSelected={tab === activeTab}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </EuiTab>
                ))}
              </EuiTabs>
              <EuiSpacer size="m" />
            </>
          )}

          <CustomAppGrid
            definition={definition}
            processor={processor}
            isEditing={isEditing}
            scope="tab"
            activeTab={activeTab}
            onLayoutChange={onLayoutChange}
            onAction={onAction}
            onEditPanel={setEditingPanelId}
            onRemovePanel={removePanel}
          />
        </CustomAppServicesProvider>
      </EuiPageTemplate.Section>

      {isAppEditorOpen && (
        <AppEditorFlyout
          definition={definition}
          onClose={() => setIsAppEditorOpen(false)}
          onApply={(next) => {
            setDefinition(next);
            setIsAppEditorOpen(false);
            setIsEditing(true);
          }}
        />
      )}

      {editingPanelId && (
        <PanelEditorFlyout
          panelId={editingPanelId}
          title={definition.panels[editingPanelId]?.title}
          messages={(definition.surfaces[editingPanelId] ?? []) as A2uiMessage[]}
          queries={definition.queries?.[editingPanelId] ?? []}
          onClose={() => setEditingPanelId(undefined)}
          onSave={(edit) => {
            setDefinition((current) =>
              current ? applyPanelEdit(current, editingPanelId, edit) : current
            );
            setEditingPanelId(undefined);
          }}
        />
      )}
    </EuiPageTemplate>
  );
}
