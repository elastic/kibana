import type { ESQLAstCommand } from '@elastic/esql/types';
import type { DateProcessor } from '../../../../types/processors';
export declare function convertDateProcessorToESQL(processor: DateProcessor): ESQLAstCommand[];
