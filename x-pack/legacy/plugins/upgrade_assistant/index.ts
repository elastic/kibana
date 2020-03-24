/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import mappings from './mappings.json';

export function upgradeAssistant(kibana: any) {
  const config: Legacy.PluginSpecOptions = {
    id: 'upgrade_assistant',
    uiExports: {
      // @ts-ignore
      savedObjectSchemas: {
        'upgrade-assistant-reindex-operation': {
          isNamespaceAgnostic: true,
        },
        'upgrade-assistant-telemetry': {
          isNamespaceAgnostic: true,
        },
      },
      mappings,
    },

    init() {},
  };
  return new kibana.Plugin(config);
}
