/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropertySelectionHandler } from '@kbn/workflows';

const SAVED_QUERIES_API = '/api/osquery/saved_queries';

interface SavedQueryItem {
  id: string; // human-readable name
  saved_object_id: string; // actual SO ID used by the API
  description?: string;
  query?: string;
  platform?: string;
}

export function createSavedQuerySelectionHandler(): PropertySelectionHandler<string> {
  return {
    search: async (input) => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '20',
        sortOrder: 'desc',
      });

      if (input) {
        params.set('search', input);
      }

      const response = await fetch(`${SAVED_QUERIES_API}?${params.toString()}`, {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
      });

      if (!response.ok) return [];

      const body = await response.json();
      const items: SavedQueryItem[] = body?.data ?? [];

      return items.map((item) => ({
        value: item.id,
        label: item.id,
        description: item.description ?? '',
        documentation: item.query
          ? `**SQL:**\n\`\`\`sql\n${item.query}\n\`\`\``
          : undefined,
      }));
    },

    resolve: async (value) => {
      // value is the human-readable name — search for it
      const params = new URLSearchParams({ page: '1', pageSize: '1', search: value });
      const response = await fetch(`${SAVED_QUERIES_API}?${params.toString()}`, {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
      });

      if (!response.ok) return null;

      const body = await response.json();
      const items: SavedQueryItem[] = body?.data ?? [];
      const item = items.find((i) => i.id === value);

      if (!item) return null;

      return {
        value: item.id,
        label: item.id,
        description: item.description ?? '',
        documentation: item.query
          ? `**SQL:**\n\`\`\`sql\n${item.query}\n\`\`\``
          : undefined,
      };
    },

    getDetails: async (input, _context, option) => {
      if (option) {
        return {
          message: `Saved query: ${option.label}`,
          links: [
            {
              text: 'Manage saved queries',
              path: '/app/osquery/saved_queries',
            },
          ],
        };
      }

      return {
        message: `Saved query "${input}" not found`,
        links: [
          {
            text: 'Create saved query',
            path: '/app/osquery/saved_queries',
          },
        ],
      };
    },
  };
}
