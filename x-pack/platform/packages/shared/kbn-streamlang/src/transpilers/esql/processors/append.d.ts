import type { ESQLAstCommand } from '@elastic/esql/types';
import type { AppendProcessor } from '../../../../types/processors';
export declare function convertAppendProcessorToESQL(processor: AppendProcessor): ESQLAstCommand[];
