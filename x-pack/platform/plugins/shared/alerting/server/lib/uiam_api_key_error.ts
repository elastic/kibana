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
 *
 * This reasoning covers *authentication* rejections only. An authorization refusal
 * ({@link UIAM_API_KEY_UNAUTHORIZED_MESSAGE}) is a separate wire shape and is repairable for a
 * different reason: UIAM authenticates the key and then declines to resolve its privileges, so it is
 * not a deliberate revocation and the objection that rules out `APIKEY_REVOKED` does not apply.
 */
export const UIAM_API_KEY_MISSING_CODE = '0x28D520';

/**
 * Elasticsearch's own wording for {@link UIAM_API_KEY_MISSING_CODE}.
 */
const UIAM_API_KEY_MISSING_MESSAGE = `failed to authenticate cloud API key: [${UIAM_API_KEY_MISSING_CODE}]`;

/**
 * Elasticsearch's wording when UIAM authenticates a cloud API key and then declines to resolve its
 * privileges, which it reports as a 403 `security_exception` rather than an authentication failure.
 *
 * There is no code to match on: unlike the authentication rejections, UIAM states no reason here, so
 * the phrase is all there is. That silence is the reason this has to be treated as repairable — the
 * only place UIAM ever explains why a key is unusable is the convert response, and nothing asks it
 * until a re-grant is attempted.
 *
 * The `for project` suffix is deliberately excluded: the project id that follows it is per-project
 * text, and the phrase is already specific enough that a rule's own error text is unlikely to carry
 * it. Unlike the missing-key case there is no bare code a detection rule could quote by accident.
 */
const UIAM_API_KEY_UNAUTHORIZED_MESSAGE = 'failed to authorize cloud API key';

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
 */
export const isMissingUiamApiKeyMessage = (message: string): boolean =>
  message.includes(UIAM_API_KEY_MISSING_MESSAGE);

/**
 * Returns true when an error *message* reports that UIAM authenticated the API key a rule run
 * presented but refused to resolve its privileges.
 *
 * Same reason for matching text as {@link isMissingUiamApiKeyMessage}: Security Solution's detection
 * rules report this as their own error string, with the Elasticsearch response long since flattened.
 */
export const isUnauthorizedUiamApiKeyMessage = (message: string): boolean =>
  message.includes(UIAM_API_KEY_UNAUTHORIZED_MESSAGE);

/**
 * Returns true when an error *message* reports that a rule's UIAM API key is unusable in a way a
 * re-grant can address — UIAM does not know the key, or knows it and will not authorize it.
 *
 * Exported from the plugin so that code paths outside alerting which swallow these rejections can
 * flag them for the healer without copying the phrases; a second copy would drift the moment either
 * side is reworded, silently disabling the repair with no test failing on either side.
 */
export const isUnusableUiamApiKeyMessage = (message: string): boolean =>
  isMissingUiamApiKeyMessage(message) || isUnauthorizedUiamApiKeyMessage(message);
