/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query, Filter } from 'src/plugins/data/public';

export interface SavedObjectDocument {
  id: string;
  type: string;
  title: string;
  attributes: {
    visualizationType: string | null;
    expression: string | null;
    state: {
      datasourceMetaData: {
        filterableIndexPatterns: Array<{ id: string; title: string }>;
      };
      datasourceStates: Record<string, unknown>;
      visualization: unknown;
      query: Query;
      filters: Filter[];
    };
    visible?: boolean;
  };
}

export const migrations: Record<'lens', object> = {
  lens: {
    '7.7.0': (doc: SavedObjectDocument) => {
      if (!doc.attributes) {
        return doc;
      }
      const visible = doc.attributes.visible;
      // visible already has a value
      if (visible !== undefined) {
        return doc;
      }
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          visible: true,
        },
      };
    },
  },
};
