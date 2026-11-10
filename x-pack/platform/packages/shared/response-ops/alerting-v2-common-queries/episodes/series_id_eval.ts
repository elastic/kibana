/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds the `series_id` expression for a given rule id column. The id is
 * base64url of `1::rule::{space_id}::{rule_id}::{group_hash}` for rule-backed
 * series (`source` null, empty or `internal`) and `1::source::{space_id}::{source}::{group_hash}`
 * for external ones; it is null when the owner is missing. An empty `source` is never an
 * external owner: it is read as no source at all, so it can't mint an id with an empty owner
 * segment that the decoder would reject.
 *
 * The leading `1` is the format version, not part of the identity: the `rule` / `source`
 * segment  already tells the kinds apart. It lets the decoder reject an id of a layout
 * it doesn't know instead of misparsing it.
 *
 * `TO_BASE64` emits standard base64, so the `REPLACE`s turn it into base64url:
 * `+` to `-`, `/` to `_`, padding stripped.
 *
 * Must produce the same bytes as `encodeSeriesId` in `@kbn/alerting-v2-utils`,
 * which is what the server decodes.
 */
const buildSeriesIdEval = (ruleIdColumn: string): string =>
  `EVAL series_id = REPLACE(REPLACE(REPLACE(TO_BASE64(CASE(source IS NULL OR source == "" OR source == "internal", CONCAT("1::rule::", space_id, "::", ${ruleIdColumn}, "::", group_hash), CONCAT("1::source::", space_id, "::", source, "::", group_hash))), "[+]", "-"), "/", "_"), "=+$", "")`;

/**
 * Derives `series_id` over `.rule-events` and `.alert-actions` together: the
 * nested `rule.id` of the former and the flat `rule_id` of the latter are
 * unified, as `addEpisodeIdActionStats` does for `alert.id` / `alert_id`.
 */
export const SERIES_ID_EVAL = buildSeriesIdEval('COALESCE(`rule.id`, rule_id)');

/** Derives `series_id` over `.rule-events` alone, which has no flat `rule_id` column. */
export const EVENTS_SERIES_ID_EVAL = buildSeriesIdEval('`rule.id`');

/** Derives `series_id` over `.alert-actions` alone, which has no `rule.id` column. */
export const ACTIONS_SERIES_ID_EVAL = buildSeriesIdEval('rule_id');
