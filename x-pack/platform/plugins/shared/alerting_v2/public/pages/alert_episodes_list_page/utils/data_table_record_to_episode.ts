/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';

export const dataTableRecordToEpisode = (record: DataTableRecord): AlertEpisode =>
  record.flattened as unknown as AlertEpisode;
