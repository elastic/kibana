/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';

/** Kibana services needed to run `kql.autocomplete.getQuerySuggestions` in the workflow YAML editor. */
export interface WorkflowKqlCompletionServices {
  kql: KqlPluginStart;
  fieldFormats: FieldFormatsStart;
}
