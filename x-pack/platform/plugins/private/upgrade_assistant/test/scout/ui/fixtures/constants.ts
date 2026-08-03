/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';

export const UPGRADE_ASSISTANT_TAGS = tags.stateful.classic;

export const UPGRADE_ASSISTANT_PATHS = {
  overview: 'management/stack/upgrade_assistant/overview',
  esDeprecations: 'management/stack/upgrade_assistant/es_deprecations',
  kibanaDeprecations: 'management/stack/upgrade_assistant/kibana_deprecations',
} as const;

export const DEPRECATED_TEMPLATE_NAME = 'deprecated_template';
export const DEPRECATED_SOURCE_MODE_MESSAGE = 'Configuring source mode in mappings is deprecated';

export const KIBANA_ADMIN_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

export const GLOBAL_DASHBOARD_READ_WITH_UPGRADE_ASSISTANT_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage'],
  },
  kibana: [
    {
      base: [],
      feature: {
        dashboard: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
