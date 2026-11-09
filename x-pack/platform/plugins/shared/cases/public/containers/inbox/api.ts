/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_INBOX_URL } from '../../../common/constants';
import type { InboxFindResponse } from '../../../common/types/api/inbox/v1';
import { KibanaServices } from '../../common/lib/kibana';

export const findInbox = async (
  owner: string[],
  signal?: AbortSignal
): Promise<InboxFindResponse> =>
  KibanaServices.get().http.fetch<InboxFindResponse>(INTERNAL_INBOX_URL, {
    method: 'GET',
    query: { owner },
    signal,
  });
