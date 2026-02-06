/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAM_NAME = 'stream.name';
export const ASSET_UUID = 'asset.uuid';
export const ASSET_ID = 'asset.id';
export const ASSET_TYPE = 'asset.type';

/** Whether a Kibana rule exists for this asset. Stored at document root (does not mention query in the field name). */
export const RULE_BACKED = 'rule_backed';

export const QUERY_TITLE = 'query.title';
export const QUERY_KQL_BODY = 'query.kql.query';
export const QUERY_SEVERITY_SCORE = 'query.severity_score';

// Initially features were called systems, for backward compatibility we need to keep the same field names
export const QUERY_FEATURE_NAME = 'experimental.query.system.name';
export const QUERY_FEATURE_FILTER = 'experimental.query.system.filter';
export const QUERY_FEATURE_TYPE = 'experimental.query.system.type';
export const QUERY_EVIDENCE = 'experimental.query.evidence';
