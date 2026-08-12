/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SIGNALS_RUNTIME_FIELD = {
  signals: {
    type: 'keyword' as const,
    script: {
      source: `
        if (params._source?.effective_config?.service?.pipelines == null) return;
        def seen = new HashSet();
        for (def k : params._source.effective_config.service.pipelines.keySet()) {
          int i = k.indexOf('/');
          def seg = i == -1 ? k : k.substring(0, i);
          if (seen.add(seg)) emit(seg);
        }
      `,
    },
  },
};
