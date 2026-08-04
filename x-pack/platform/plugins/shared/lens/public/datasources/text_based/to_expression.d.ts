import type { Ast } from '@kbn/interpreter';
import type { TextBasedPrivateState } from '@kbn/lens-common';
export declare function toExpression(state: TextBasedPrivateState, layerId: string): Ast | null;
