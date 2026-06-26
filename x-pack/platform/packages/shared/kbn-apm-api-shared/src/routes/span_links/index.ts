/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { linkedParentsRoute } from './linked_parents';
import { linkedChildrenRoute } from './linked_children';
import { spanLinksRoute } from './span_links';

export const spanLinksRouteDefinitions = {
  linkedParents: linkedParentsRoute,
  linkedChildren: linkedChildrenRoute,
  spanLinks: spanLinksRoute,
};

export type { LinkedParentsResponse } from './linked_parents';
export type { LinkedChildrenResponse } from './linked_children';
export type { SpanLinksResponse } from './span_links';
