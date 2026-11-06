/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';

/**
 * Streams list builds unmanaged entries from `indices.getDataStream()` without
 * `expand_wildcards: hidden`. For superusers, elasticsearch still returns data
 * streams that are both `system: true` and `hidden: true` (e.g. Workflows'
 * `.workflows-events`, created on Kibana startup via `@kbn/data-streams`).
 * elasticsearch treats system indices as visible when
 * `SystemIndexAccessLevel.ALL` applies, bypassing the hidden flag.
 *
 * Without this filter those internal streams surface as unmanaged "classic"
 * rows on `/app/streams/`. Fleet applies a similar exclusion for its data
 * streams list (`handlers.ts`: dot-prefixed names such as `.workflows-events`).
 */
export const shouldIncludeFromStreamsList = ({
  hidden,
}: Pick<IndicesDataStream, 'hidden'>): boolean => !hidden;
