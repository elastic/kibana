import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { QueryCorrection } from './types';
export type { QueryCorrection } from './types';
export declare const correctAll: (query: ESQLAstQueryExpression) => QueryCorrection[];
