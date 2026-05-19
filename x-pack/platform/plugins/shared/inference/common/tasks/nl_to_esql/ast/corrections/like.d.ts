import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { QueryCorrection } from './types';
/**
 * Correct wrong LIKE wildcard mistakes.
 * The LLM can make mistake and use SQL wildcards for LIKE operators.
 *
 * E.g.
 * `column LIKE "ba_"` => `column LIKE "ba?"`
 * `column LIKE "ba%"` => `column LIKE "ba*"`
 */
export declare const correctLikeWildcards: (query: ESQLAstQueryExpression) => QueryCorrection[];
