/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { AlertInstanceContext } from '@kbn/alerting-plugin/server';

export interface ActionContext extends ESQLActionContext {
  title: string;
  message: string;
}

export interface ESQLActionContext extends AlertInstanceContext {
  date: string;
  hits: estypes.SearchHit[];
  link: string;
  sourceFields: { [key: string]: string[] };
}
