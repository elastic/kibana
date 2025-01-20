/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import type { ResolvedSimpleSavedObject } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { GraphStore } from '../state_management';
import { GraphWorkspaceSavedObject, Workspace } from '../types';
import { getEmptyWorkspace, getSavedWorkspace } from './saved_workspace_utils';
import { getEditUrl } from '../services/url';

export interface UseWorkspaceLoaderProps {
  store: GraphStore;
  workspaceRef: React.MutableRefObject<Workspace | undefined>;
  contentClient: ContentClient;
  coreStart: CoreStart;
  spaces?: SpacesApi;
  data: DataPublicPluginStart;
}

interface WorkspaceUrlParams {
  id?: string;
}

export interface SharingSavedObjectProps {
  outcome?: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
}

interface WorkspaceLoadedState {
  savedWorkspace: GraphWorkspaceSavedObject;
  sharingSavedObjectProps?: SharingSavedObjectProps;
}

export const useWorkspaceLoader = ({
  coreStart,
  spaces,
  workspaceRef,
  store,
  contentClient,
  data,
}: UseWorkspaceLoaderProps) => {
  const [state, setState] = useState<WorkspaceLoadedState>();
  const { replace: historyReplace } = useHistory();
  const { search } = useLocation();
  const { id } = useParams<WorkspaceUrlParams>();

  /**
   * The following effect initializes workspace initially and reacts
   * on changes in id parameter and URL query only.
   */
  useEffect(() => {
    const urlQuery = new URLSearchParams(search).get('query');

    function loadWorkspace(
      fetchedSavedWorkspace: GraphWorkspaceSavedObject,
      dataViews: DataViewListItem[]
    ) {
      store.dispatch({
        type: 'x-pack/graph/LOAD_WORKSPACE',
        payload: {
          savedWorkspace: fetchedSavedWorkspace,
          dataViews,
          urlQuery,
        },
      });
    }

    function clearStore() {
      store.dispatch({ type: 'x-pack/graph/RESET' });
    }

    async function fetchSavedWorkspace(): Promise<{
      savedObject: GraphWorkspaceSavedObject;
      sharingSavedObjectProps?: SharingSavedObjectProps;
    }> {
      return id
        ? await getSavedWorkspace(contentClient, id).catch(function (e) {
            coreStart.notifications.toasts.addError(e, {
              title: i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                defaultMessage: "Couldn't load graph with ID",
              }),
            });
            historyReplace('/home');
            // return promise that never returns to prevent the controller from loading
            return new Promise(() => {});
          })
        : getEmptyWorkspace();
    }

    async function initializeWorkspace() {
      const {
        savedObject: fetchedSavedWorkspace,
        sharingSavedObjectProps: fetchedSharingSavedObjectProps,
      } = await fetchSavedWorkspace();

      if (spaces && fetchedSharingSavedObjectProps?.outcome === 'aliasMatch') {
        // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
        const newObjectId = fetchedSharingSavedObjectProps.aliasTargetId!; // This is always defined if outcome === 'aliasMatch'
        const newPath = getEditUrl(coreStart.http.basePath.prepend, { id: newObjectId }) + search;
        spaces.ui.redirectLegacyUrl({
          path: newPath,
          aliasPurpose: fetchedSharingSavedObjectProps.aliasPurpose,
          objectNoun: i18n.translate('xpack.graph.legacyUrlConflict.objectNoun', {
            defaultMessage: 'Graph',
          }),
        });
        return null;
      }

      const dataViews = await data.dataViews.getIdsWithTitle();

      /**
       * Deal with situation of request to open saved workspace. Otherwise clean up store,
       * when navigating to a new workspace from existing one.
       */
      if (fetchedSavedWorkspace.id) {
        loadWorkspace(fetchedSavedWorkspace, dataViews);
      } else if (workspaceRef.current) {
        clearStore();
      }
      setState({
        savedWorkspace: fetchedSavedWorkspace,
        sharingSavedObjectProps: fetchedSharingSavedObjectProps,
      });
    }

    initializeWorkspace();
  }, [
    id,
    search,
    store,
    historyReplace,
    contentClient,
    setState,
    coreStart,
    workspaceRef,
    spaces,
    data.dataViews,
  ]);

  return state;
};
