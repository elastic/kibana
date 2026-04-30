/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

// Requires _source to be stored on .fleet-agents (it is by default).
// Non-OpAMP agents emit nothing (cfg null or no service block).
// Emits a deterministically assembled fingerprint string covering:
//   - top-level component sections (receivers, processors, exporters, connectors): sorted keys
//   - service.pipelines: sorted pipeline names, each with sorted component ref lists
//   - service.extensions: sorted active extension list
// the fingerprint string is hashed to a human-readable label in TypeScript by pipelineConfigLabel().
export const PIPELINE_CONFIG_RUNTIME_FIELD: estypes.MappingRuntimeFields = {
  pipeline_config: {
    type: 'keyword',
    script: {
      lang: 'painless',
      source: `
        def cfg = params._source['effective_config'];
        if (cfg == null) return;

        def parts = new ArrayList();

        // Top-level component sections — sorted keys only (names, not config values)
        for (def section : ['receivers', 'processors', 'exporters', 'connectors']) {
          if (cfg[section] instanceof Map) {
            def keys = new ArrayList(cfg[section].keySet());
            Collections.sort(keys);
            parts.add(section + ':' + String.join(',', keys));
          }
        }

        if (cfg.service instanceof Map) {
          // service.pipelines — sorted pipeline names with sorted component ref lists
          if (cfg.service.pipelines instanceof Map) {
            def pipeNames = new ArrayList(cfg.service.pipelines.keySet());
            Collections.sort(pipeNames);
            for (def p : pipeNames) {
              def pipe = cfg.service.pipelines[p];
              def r  = pipe.receivers  instanceof List ? new ArrayList(pipe.receivers)  : new ArrayList();
              def pr = pipe.processors instanceof List ? new ArrayList(pipe.processors) : new ArrayList();
              def ex = pipe.exporters  instanceof List ? new ArrayList(pipe.exporters)  : new ArrayList();
              Collections.sort(r); Collections.sort(pr); Collections.sort(ex);
              parts.add('pipe:' + p + '[' + String.join(',', r) + '|' + String.join(',', pr) + '|' + String.join(',', ex) + ']');
            }
          }

          // service.extensions — sorted active extension list
          if (cfg.service.extensions instanceof List) {
            def exts = new ArrayList(cfg.service.extensions);
            Collections.sort(exts);
            parts.add('ext:' + String.join(',', exts));
          }
        }

        if (parts.isEmpty()) return;

        emit(String.join(';', parts));
      `,
    },
  },
};
