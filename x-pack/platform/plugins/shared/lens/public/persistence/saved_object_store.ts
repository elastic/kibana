/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { VisualizationClient } from '@kbn/visualizations-plugin/public';
import type { LensSavedObjectAttributes, LensSearchQuery } from '../../common/content_management';
import { getLensClient } from './lens_client';

export interface LensDocument {
  savedObjectId?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  description?: string;
  state: {
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query | AggregateQuery;
    globalPalette?: {
      activePaletteId: string;
      state?: unknown;
    };
    filters: Filter[];
    needsRefresh?: boolean;
    adHocDataViews?: Record<string, DataViewSpec>;
    internalReferences?: SavedObjectReference[];
  };
  references: SavedObjectReference[];
}

export interface DocumentSaver {
  save: (vis: LensDocument) => Promise<{ savedObjectId: string }>;
}

export interface DocumentLoader {
  load: (savedObjectId: string) => Promise<unknown>;
}

export type SavedObjectStore = DocumentLoader & DocumentSaver;

export class SavedObjectIndexStore implements SavedObjectStore {
  private client: VisualizationClient<'lens', LensSavedObjectAttributes>;

  constructor(cm: ContentManagementPublicStart) {
    this.client = getLensClient(cm);
  }

  save = async (vis: LensDocument) => {
    const { savedObjectId, type, references, ...attributes } = vis;

    if (savedObjectId) {
      const result = await this.client.update({
        id: savedObjectId,
        data: attributes,
        options: {
          references,
        },
      });
      return { ...vis, savedObjectId: result.item.id };
    }
    const result = await this.client.create({
      data: attributes,
      options: {
        references,
      },
    });
    return { ...vis, savedObjectId: result.item.id };
  };

  async load(savedObjectId: string) {
    const resolveResult = await this.client.get(savedObjectId);

    if (resolveResult.item.error) {
      throw resolveResult.item.error;
    }

    return resolveResult;
  }

  async search(query: SearchQuery, options: LensSearchQuery) {
    const result = await this.client.search(query, options);
    return result;
  }
}
