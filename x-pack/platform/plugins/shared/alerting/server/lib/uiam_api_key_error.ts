/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * UIAM's `APIKEY_MISSING`, which Elasticsearch surfaces as `authentication_error_code` on the 401 it
 * returns when UIAM does not know the API key a request presented — the key was deleted, so the only
 * recovery is a new one.
 *
 * The single code is the point: every other API key rejection UIAM reports leaves the key intact or
 * is not understood well enough to act on. `APIKEY_EXPIRED` (`0xE436AE`) is not known to be
 * reachable for keys Kibana grants itself, since a converted key inherits the expiration of the
 * Elasticsearch key behind it; `APIKEY_REVOKED` (`0xD38358`) would mean re-granting over a
 * deliberate revocation; and `APIKEY_CLIENT_AUTH1`/`2` mean the key is valid but Kibana presented
 * the wrong client authentication. A bare 401 says nothing about the key at all.
 */
export const UIAM_API_KEY_MISSING_CODE = '0x28D520';

/**
 * Elasticsearch's own wording for {@link UIAM_API_KEY_MISSING_CODE}.
 */
const UIAM_API_KEY_MISSING_MESSAGE = `failed to authenticate cloud API key: [${UIAM_API_KEY_MISSING_CODE}]`;

/**
 * Returns true when an error *message* reports that UIAM no longer knows the API key a rule run
 * authenticated with.
 *
 * This exists because some failures reach the alerting framework as text and nothing else: a rule
 * type that records a failed run instead of throwing, or that catches the Elasticsearch error and
 * reports its own message, flattens the response and leaves no `statusCode` or
 * `authentication_error_code` to test.
 *
 * The whole phrase is required, not the bare code, so a re-grant cannot be triggered by a rule whose
 * own error text happens to quote it — a real possibility for detection rules that search for
 * authentication failures.
 *
 * Exported from the plugin so that code paths outside alerting which swallow this rejection can flag
 * it for the healer without copying the phrase; a second copy would drift the moment either side is
 * reworded, silently disabling the repair with no test failing on either side.
 */
export const isMissingUiamApiKeyMessage = (message: string): boolean =>
  message.includes(UIAM_API_KEY_MISSING_MESSAGE);
