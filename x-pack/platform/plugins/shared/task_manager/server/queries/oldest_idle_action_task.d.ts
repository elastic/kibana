/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Returns the millisecond timestamp of the oldest action task that may still be executed (with a 24 hour delay).
 * Useful for cleaning up related objects that may no longer be needed.
 * @internal
 */
export declare const getOldestIdleActionTask: (
  client: Pick<ElasticsearchClient, 'search'>,
  taskManagerIndex: string
) => Promise<string>;
