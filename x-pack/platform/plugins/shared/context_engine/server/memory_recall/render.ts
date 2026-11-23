/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import type { RecallResult } from '../../common/http_api/memory_recall';

/** The `yaml` format: the results as one YAML string for a model to read. */
export const renderYaml = (results: RecallResult[]): string =>
  stringify(
    {
      results: results.map(
        ({ id, session_id: sessionId, source, date, role, content, attributes }) => ({
          id,
          ...(sessionId !== undefined && { session_id: sessionId }),
          source,
          ...(date !== undefined && { date }),
          ...(role !== undefined && { role }),
          content,
          ...(attributes !== undefined && { attributes }),
        })
      ),
    },
    { lineWidth: 0 }
  );
