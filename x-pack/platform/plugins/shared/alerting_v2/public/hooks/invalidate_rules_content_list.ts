/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contentListKeys, contentListQueryClient } from '@kbn/content-list-provider';
import { RULES_CONTENT_LIST_ID } from '../constants';
import { ruleKeys } from './query_key_factory';

/**
 * `ContentListProvider` (rules list page) wraps its subtree in its own
 * `QueryClient`, separate from the app-level one `useQueryClient()` normally
 * resolves to. Anything rendered under the provider — including the rules
 * list itself and `useFetchRuleTags`, called from the Tags filter popover —
 * caches into that provider-owned client.
 *
 * Rule mutations are triggered from call sites both inside that subtree
 * (e.g. row actions in the table) and outside it (e.g. the compose-discover
 * flyout, shared across several pages and rendered above the provider), so a
 * mutation can't rely on the ambient `useQueryClient()` result alone to reach
 * the rules list. These helpers invalidate the provider's client directly
 * using the same `contentListKeys` / `ruleKeys` scoping the list and the
 * tags query already key off, so every mutation hook targets the exact same
 * cache entries rather than each hand-rolling its own key.
 */

/** Invalidates the rules list's items query (name/status/kind/tags changes). */
export const invalidateRulesListView = (): Promise<void> =>
  contentListQueryClient.invalidateQueries({
    queryKey: contentListKeys.all(RULES_CONTENT_LIST_ID),
  });

/** Invalidates the Tags filter's tag-name query (only needed when tags may have changed). */
export const invalidateRulesTagsFacet = (): Promise<void> =>
  contentListQueryClient.invalidateQueries({ queryKey: ruleKeys.allTags() });

/** Invalidates both the rules list and the tags facet. */
export const invalidateRulesContentList = (): Promise<void> =>
  Promise.all([invalidateRulesListView(), invalidateRulesTagsFacet()]).then(() => undefined);
