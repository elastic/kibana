/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLFunction, ESQLLiteral } from '@kbn/esql-ast';

/**
 * represents a DATE_TRUNC function node.
 */
export type ESQLDateTruncFunction = ESQLFunction<'variadic-call', 'date_trunc'>;

/**
 * represents a LIKE function node.
 */
export type ESQLLikeOperator = ESQLFunction<'binary-expression', 'like'>;

/**
 * represents a BUCKET function node.
 */
export type ESQLBucketFunction = ESQLFunction<'variadic-call', 'bucket'>;

/**
 * represents an ESQL string literal.
 */
export type ESQLStringLiteral = Extract<ESQLLiteral, { literalType: 'keyword' }>;
