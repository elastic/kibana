import type { ESQLAstCommand } from '@elastic/esql/types';
import { type SetProcessor } from '../../../../types/processors';
export declare function convertSetProcessorToESQL(processor: SetProcessor): ESQLAstCommand[];
