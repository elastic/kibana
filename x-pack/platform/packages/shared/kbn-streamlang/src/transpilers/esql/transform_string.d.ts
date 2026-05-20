import type { ESQLAstCommand } from '@elastic/esql/types';
import type { Condition } from '../../../types/conditions';
export declare const createTransformStringESQL: (esqlFunc: string) => (processor: {
    from: string;
    to?: string;
    ignore_missing?: boolean;
    where?: Condition;
}) => ESQLAstCommand[];
