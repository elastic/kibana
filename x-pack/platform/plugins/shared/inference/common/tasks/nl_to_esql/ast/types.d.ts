import type { ESQLFunction, ESQLLiteral } from '@elastic/esql/types';
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
export type ESQLStringLiteral = Extract<ESQLLiteral, {
    literalType: 'keyword';
}>;
