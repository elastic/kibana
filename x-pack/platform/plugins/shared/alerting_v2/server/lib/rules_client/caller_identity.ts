/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';

/**
 * The identity declared by an in-process caller when it creates a rules client.
 *
 * `solution` is the managed-rules identity: a client bearing it may write rules
 * whose ownership solution matches. `app` is the unmanaged-rules attribution
 * that fills `ownership.app` on the rule at create time.
 *
 * Both fields are optional. A client with no `solution` cannot write managed
 * rules. A client with no `app` leaves `ownership.app` absent.
 *
 * Declared identity is a trust model, not a security boundary. In-process
 * callers are trusted Kibana code; end users reach the framework only through
 * HTTP surfaces, which carry no identity.
 *
 * Ref: rule-ownership.md "Caller identity"
 */
export interface CallerIdentity {
  solution?: string;
  app?: string;
}

/**
 * DI token for the optional caller identity bound into a request scope.
 *
 * The framework's own HTTP routes leave this unset (the default binding
 * returns `undefined`), so the entire generic API surface is identity-less by
 * construction. In-process callers that pass `options.onBehalfOf` to
 * `getRulesClientWithRequest` have the value overridden in `buildScope`.
 */
export const CallerIdentityToken = createToken<CallerIdentity | undefined>(
  'alerting_v2.RulesClient.CallerIdentity'
);
