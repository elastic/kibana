/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerSentEventError } from '@kbn/sse-utils';

export class ReplacementsNamespaceMismatchError extends ServerSentEventError<
  'namespaceMismatch',
  { replacementsId: string; requestedNamespace: string; actualNamespace: string }
> {
  constructor(replacementsId: string, requestedNamespace: string, actualNamespace: string) {
    super(
      'namespaceMismatch',
      `Replacements namespace mismatch for id "${replacementsId}": access denied`,
      {
        replacementsId,
        requestedNamespace,
        actualNamespace,
      }
    );
    this.name = 'ReplacementsNamespaceMismatchError';
  }
}
