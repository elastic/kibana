/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-field route validation bounds for licensing internal feature-usage APIs.
 *
 * `featureId` values in-repo top out around 44 chars (e.g. maps geo_tile
 * aggregation labels). `licenseType` is a closed LICENSE_TYPE enum (longest
 * key: `enterprise`).
 */

/** Feature usage registration / notify identifier. */
export const MAX_LICENSING_FEATURE_ID_LENGTH = 128;

/** LICENSE_TYPE enum key (`basic` … `enterprise` / `trial`). */
export const MAX_LICENSING_LICENSE_TYPE_LENGTH = 16;
