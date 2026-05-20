import type { ESQLAstCommand } from '@elastic/esql/types';
import type { DropDocumentProcessor } from '../../../../types/processors';
export declare const convertDropDocumentProcessorToESQL: (processor: DropDocumentProcessor) => ESQLAstCommand[];
