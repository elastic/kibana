/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropertySelectionHandler } from '@kbn/workflows';

const PACKS_API = '/api/osquery/packs';

interface PackItem {
  name: string; // human-readable name
  saved_object_id: string; // actual SO ID used by the API
  description?: string;
  queries?: Record<string, unknown>;
}

export function createPackSelectionHandler(): PropertySelectionHandler<string> {
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

      const response = await fetch(`${PACKS_API}?${params.toString()}`, {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
      });

      if (!response.ok) return [];

      const body = await response.json();
      const items: PackItem[] = body?.data ?? [];

      return items.map((item) => {
        const queryCount = Object.keys(item.queries ?? {}).length;

        return {
          value: item.name,
          label: item.name,
          description: item.description ?? '',
          documentation: `**Queries:** ${queryCount}`,
        };
      });
    },

    resolve: async (value) => {
      // value is the human-readable name — search for it
      const params = new URLSearchParams({ page: '1', pageSize: '1', search: value });
      const response = await fetch(`${PACKS_API}?${params.toString()}`, {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
        },
      });

      if (!response.ok) return null;

      const body = await response.json();
      const items: PackItem[] = body?.data ?? [];
      const item = items.find((i) => i.name === value);

      if (!item) return null;

      const queryCount = Object.keys(item.queries ?? {}).length;

      return {
        value: item.name,
        label: item.name ?? value,
        description: item.description ?? '',
        documentation: `**Queries:** ${queryCount}`,
      };
    },

    getDetails: async (input, _context, option) => {
      if (option) {
        return {
          message: `Pack: ${option.label}`,
          links: [
            {
              text: 'Manage packs',
              path: '/app/osquery/packs',
            },
          ],
        };
      }

      return {
        message: `Pack "${input}" not found`,
        links: [
          {
            text: 'Create pack',
            path: '/app/osquery/packs',
          },
        ],
      };
    },
  };
}
