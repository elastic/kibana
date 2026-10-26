/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { filter, map, pipe } from 'rxjs';
import { isApiStateChangedEvent, matchesAnyApiSelector } from '@kbn/agent-builder-common';
import type { ApiReference, ApiStateChangedEventData } from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from './events';

export interface ApiStateChangesOptions {
  /**
   * Operations to listen for. Each entry pairs a target with `*`, a namespace wildcard such as
   * `cases.*`, or an exact operation id such as `cases.create-case`, and only
   * matches operations on its own target.
   */
  apis: readonly ApiReference[];
}

/**
 * RxJS operator that narrows a chat event stream to the successful, non-read-only operations the
 * agent ran through `execute_api`. Standalone executions report nothing.
 *
 *   events.getChatEvents$(conversationId).pipe(
 *     filterApiStateChanges({ apis: [{ target: 'kibana', api: 'cases.*' }] })
 *   ).subscribe(({ api, method, path }) => refreshCases());
 *
 * @param options - The operations to listen for.
 * @returns An operator emitting the matching operations, each with its target, id, HTTP method
 * and request path.
 */
export const filterApiStateChanges = ({
  apis,
}: ApiStateChangesOptions): OperatorFunction<BrowserChatEvent, ApiStateChangedEventData> =>
  pipe(
    filter(isApiStateChangedEvent),
    map(({ data: { data } }) => data),
    filter((change) => matchesAnyApiSelector(apis, change))
  );
