/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Every Nightshift source is materialised as an ES|QL view under this prefix. The `$.`
 * namespace is the one Streams already uses for its views, so index wildcards such as
 * `FROM logs*` never match a source view by accident.
 */
export const NIGHTSHIFT_SOURCE_VIEW_PREFIX = '$.nightshift.sources.';

export const getNightshiftSourceViewName = (sourceId: string): string =>
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}${sourceId}`;
