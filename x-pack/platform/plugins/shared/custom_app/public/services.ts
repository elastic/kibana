/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';

interface Services {
  core: CoreStart;
  search: ISearchGeneric;
  embeddable: EmbeddableStart;
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  /** Absent when Agent Builder is not available, in which case nothing offers chat. */
  agentBuilder: AgentBuilderPluginStart | undefined;
  /** Absent when Share is not available, in which case a link to Discover cannot be made. */
  share: SharePluginStart | undefined;
  /** Whether anything offers the editor, which a build can turn off to make apps only by chat. */
  isEditorEnabled: boolean;
}

let services: Services | undefined;

export const setServices = (
  core: CoreStart,
  search: ISearchGeneric,
  embeddable: EmbeddableStart,
  dataViews: DataViewsPublicPluginStart,
  lens: LensPublicStart,
  agentBuilder: AgentBuilderPluginStart | undefined,
  share?: SharePluginStart,
  isEditorEnabled = true
) => {
  services = { core, search, embeddable, dataViews, lens, agentBuilder, share, isEditorEnabled };
};

export const getServices = (): Services => {
  if (!services) throw new Error('CustomApp services not initialized');
  return services;
};
