/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo, useEffect } from 'react';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPageTemplate,
  EuiTitle,
} from '@elastic/eui';
import {
  type ContentListItem,
  type ContentEditorSaveArgs,
  ContentEditorActionProvider,
} from '@kbn/content-list-provider';
import { ContentEditorKibanaProvider } from '@kbn/content-management-content-editor';
import {
  ContentListClientKibanaProvider,
  type TableListViewFindItemsFn,
} from '@kbn/content-list-provider-client';
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

import type { MapItem } from '../../../common/content_management';
import {
  MAP_SAVED_OBJECT_TYPE,
  APP_ID,
  APP_NAME,
  getEditPath,
  MAP_PATH,
} from '../../../common/constants';
import {
  getMapsCapabilities,
  getCoreChrome,
  getExecutionContextService,
  getNavigateToApp,
  getUsageCollection,
  getServerless,
  getUiSettings,
} from '../../kibana_services';
import { getMapClient } from '../../content_management';

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';

const onCreate = () => {
  const navigateToApp = getNavigateToApp();
  getUsageCollection()?.reportUiCounter(APP_ID, METRIC_TYPE.CLICK, 'create_maps_vis_editor');
  navigateToApp(APP_ID, {
    path: MAP_PATH,
  });
};

const NAME = i18n.translate('xpack.maps.mapListing.entityName', {
  defaultMessage: 'map',
});
const NAME_PLURAL = i18n.translate('xpack.maps.mapListing.entityNamePlural', {
  defaultMessage: 'maps',
});

interface Props {
  history: ScopedHistory;
  coreStart: CoreStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
}

const MapsListViewComp = ({ history, coreStart, savedObjectsTagging }: Props) => {
  const deleteMap = useCallback(
    async (id: string) => {
      await coreStart.http.delete(`/api/saved_objects/${MAP_SAVED_OBJECT_TYPE}/${id}`);
    },
    [coreStart.http]
  );
  getExecutionContextService().set({
    type: 'application',
    name: APP_ID,
    page: 'list',
  });

  const isReadOnly = !getMapsCapabilities().save;

  // Set breadcrumbs on mount.
  useEffect(() => {
    getCoreChrome().docTitle.change(APP_NAME);
    if (getServerless()) {
      getServerless()!.setBreadcrumbs({ text: APP_NAME });
    } else {
      getCoreChrome().setBreadcrumbs([{ text: APP_NAME }]);
    }
  }, []);

  const onClick = useCallback(
    (item: { id: string }) => {
      history.push(getEditPath(item.id));
    },
    [history]
  );

  const onDelete = useCallback(
    async (item: { id: string }) => {
      await deleteMap(item.id);
    },
    [deleteMap]
  );

  const onSelectionDelete = useCallback(
    async (items: ContentListItem[]) => {
      await Promise.all(items.map((item) => deleteMap(item.id)));
    },
    [deleteMap]
  );

  // Content editor save handler.
  const onContentEditorSave = useCallback(
    async (args: ContentEditorSaveArgs) => {
      const { id, title, description, tags } = args;
      // Update the map's title and description via saved objects API.
      // Tags is an array of tag IDs (strings).
      await coreStart.http.put(`/api/saved_objects/${MAP_SAVED_OBJECT_TYPE}/${id}`, {
        body: JSON.stringify({
          attributes: { title, description },
          references: tags.map((tagId) => ({ type: 'tag', id: tagId, name: `tag-${tagId}` })),
        }),
      });
    },
    [coreStart.http]
  );

  // =========================================================================
  // Find Items (TableListView-compatible) for Client Provider
  // =========================================================================

  // Transform MapItem to UserContentCommonSchema format.
  const toTableListViewSavedObject = (mapItem: MapItem): UserContentCommonSchema => {
    return {
      id: mapItem.id,
      type: mapItem.type,
      updatedAt: mapItem.updatedAt ?? '',
      updatedBy: mapItem.updatedBy,
      createdAt: mapItem.createdAt,
      createdBy: mapItem.createdBy,
      managed: mapItem.managed,
      references: mapItem.references,
      attributes: {
        title: mapItem.attributes.title ?? '',
        description: mapItem.attributes.description,
      },
    };
  };

  // Use the existing MapClient.search() - same as the original TableListView implementation.
  const findItems: TableListViewFindItemsFn<UserContentCommonSchema> = useCallback(
    async (searchQuery, refs) => {
      const { references = [], referencesToExclude = [] } = refs ?? {};

      return getMapClient()
        .search({
          text: searchQuery ? `${searchQuery}*` : undefined,
          limit: getUiSettings().get(SAVED_OBJECTS_LIMIT_SETTING),
          tags: {
            included: references.map(({ id }) => id),
            excluded: referencesToExclude.map(({ id }) => id),
          },
        })
        .then(({ hits, pagination: { total } }) => {
          return {
            total,
            hits: hits.map(toTableListViewSavedObject),
          };
        })
        .catch(() => {
          return {
            total: 0,
            hits: [],
          };
        });
    },
    []
  );

  // =========================================================================
  // Shared Props
  // =========================================================================

  const sharedServices = {
    core: coreStart,
    // The tagging service is always available when the maps plugin is loaded.
    savedObjectsTagging: savedObjectsTagging!,
  };

  const sharedItemProps = {
    getHref: (item: ContentListItem) => getEditPath(item.id),
    actions: {
      onClick,
      onEdit: onClick,
      onDelete,
    },
  };

  const sharedFeatures = {
    globalActions: { onCreate },
    selection: {
      onSelectionDelete,
    },
    contentEditor: {
      onSave: onContentEditorSave,
    },
  };

  return (
    <>
      {/* Page Title */}
      <EuiPageTemplate.Section>
        <EuiTitle size="l">
          <h1>{APP_NAME}</h1>
        </EuiTitle>
      </EuiPageTemplate.Section>

      {/* ================================================================= */}
      {/* CLIENT PROVIDER - Uses findItems with client-side operations */}
      {/* ================================================================= */}
      <EuiPageTemplate.Section>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="desktop" size="l" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>Client Provider</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <ContentListClientKibanaProvider
          findItems={findItems}
          entityName={NAME}
          entityNamePlural={NAME_PLURAL}
          services={sharedServices}
          isReadOnly={isReadOnly}
          item={sharedItemProps}
          features={sharedFeatures}
        >
          {/* ContentEditorKibanaProvider must be inside ContentListProvider to access UserProfilesProvider.
              ContentEditorActionProvider must be inside ContentEditorKibanaProvider to call useOpenContentEditor. */}
          <ContentEditorKibanaProvider
            core={coreStart}
            savedObjectsTagging={
              savedObjectsTagging as Parameters<
                typeof ContentEditorKibanaProvider
              >[0]['savedObjectsTagging']
            }
          >
            <ContentEditorActionProvider>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <ContentListToolbar data-test-subj="mapsListingToolbar-client" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ContentListTable
                    title="Maps listing table"
                    data-test-subj="mapsListingTable-client"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ContentEditorActionProvider>
          </ContentEditorKibanaProvider>
        </ContentListClientKibanaProvider>
      </EuiPageTemplate.Section>

      <EuiHorizontalRule margin="xl" />

      {/* ================================================================= */}
      {/* SERVER PROVIDER - Uses savedObjectType with server-side operations */}
      {/* ================================================================= */}
      <EuiPageTemplate.Section>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="cluster" size="l" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>Server Provider</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <ContentListServerKibanaProvider
          savedObjectType={MAP_SAVED_OBJECT_TYPE}
          entityName={NAME}
          entityNamePlural={NAME_PLURAL}
          services={sharedServices}
          isReadOnly={isReadOnly}
          item={sharedItemProps}
          features={sharedFeatures}
        >
          {/* ContentEditorKibanaProvider must be inside ContentListProvider to access UserProfilesProvider.
              ContentEditorActionProvider must be inside ContentEditorKibanaProvider to call useOpenContentEditor. */}
          <ContentEditorKibanaProvider
            core={coreStart}
            savedObjectsTagging={
              savedObjectsTagging as Parameters<
                typeof ContentEditorKibanaProvider
              >[0]['savedObjectsTagging']
            }
          >
            <ContentEditorActionProvider>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <ContentListToolbar data-test-subj="mapsListingToolbar-server" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ContentListTable
                    title="Maps listing table"
                    data-test-subj="mapsListingTable-server"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ContentEditorActionProvider>
          </ContentEditorKibanaProvider>
        </ContentListServerKibanaProvider>
      </EuiPageTemplate.Section>
    </>
  );
};

export const MapsListView = memo(MapsListViewComp);
