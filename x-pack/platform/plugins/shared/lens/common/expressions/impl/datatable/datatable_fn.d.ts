import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '../../../types';
import type { DatatableExpressionFunction } from '../../defs/datatable/types';
export declare const datatableFn: (getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>) => DatatableExpressionFunction["fn"];
