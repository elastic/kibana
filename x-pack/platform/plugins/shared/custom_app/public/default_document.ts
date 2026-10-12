/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppDocument } from '@kbn/custom-app-common';

/** The starter content of a newly added panel. */
export const createDefaultDocument = (): AppDocument => ({
  state: {},
  // Temporary demo source that needs no data; replaced by templates once the start flow exists.
  dataSources: { activeUsers: { type: 'esql', query: 'ROW active_users = 1284' } },
  root: {
    type: 'stack',
    id: 'root',
    direction: 'vertical',
    gap: 'm',
    children: [
      {
        type: 'heading',
        id: 'title',
        size: 'm',
        text: i18n.translate('xpack.customApp.defaultDocument.title', {
          defaultMessage: 'Your custom app',
        }),
      },
      {
        type: 'text',
        id: 'intro',
        text: i18n.translate('xpack.customApp.defaultDocument.intro', {
          defaultMessage: 'This panel is built from components. Editing is coming soon.',
        }),
      },
      {
        type: 'stat',
        id: 'active-users',
        title: i18n.translate('xpack.customApp.defaultDocument.statTitle', {
          defaultMessage: 'Active users',
        }),
        source: 'activeUsers',
        format: 'number',
      },
    ],
  },
});
