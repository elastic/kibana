import type { ESQLAstItem, ESQLSingleAstItem } from '@elastic/esql/types';
import { type Condition } from '../../../types/conditions';
export declare function esqlLiteralFromAny(value: unknown): ESQLAstItem;
export declare function conditionToESQLAst(condition: Condition): ESQLSingleAstItem;
