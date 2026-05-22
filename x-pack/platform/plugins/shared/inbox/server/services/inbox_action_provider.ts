/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InboxAction, ListInboxActionsRequestQuery } from '@kbn/inbox-common';

/**
 * Request-scoped context passed to every provider call. Providers receive the
 * originating `KibanaRequest` so they can call their own plugin's APIs as the
 * current user (via scoped clients) and honor space/auth semantics.
 */
export interface InboxRequestContext {
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Filters a provider sees when satisfying a list request. These mirror the
 * public `ListInboxActionsRequestQuery` but are pre-validated by the framework
 * and exclude cross-provider pagination concerns (those are handled by the
 * registry after fan-out).
 */
export interface InboxActionProviderListParams {
  status?: ListInboxActionsRequestQuery['status'];
}

export interface InboxActionProviderListResult {
  actions: InboxAction[];
  /**
   * Pre-pagination total for this provider. The registry sums these to report
   * an accurate cross-source total even when a page only surfaces results
   * from one provider.
   */
  total: number;
}

/**
 * Contract that any plugin wishing to contribute HITL entries to the Inbox
 * must implement. Aligns with the "channel extensibility" vision of the
 * HITL GA epic ([security-team#16712](https://github.com/elastic/security-team/issues/16712)).
 *
 * `respond(input)` is intentionally opaque — the payload shape is defined by
 * the `input_schema` on the matching `InboxAction`. The provider is
 * responsible for any downstream dispatch (e.g. resuming a workflow,
 * patching a rule, posting to Slack).
 */
export interface InboxActionProvider {
  readonly sourceApp: string;

  list(
    params: InboxActionProviderListParams,
    ctx: InboxRequestContext
  ): Promise<InboxActionProviderListResult>;

  respond(
    sourceId: string,
    input: Record<string, unknown>,
    ctx: InboxRequestContext
  ): Promise<void>;
}
