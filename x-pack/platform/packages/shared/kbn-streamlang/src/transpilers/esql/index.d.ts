import type { BasicPrettyPrinterOptions } from '@elastic/esql';
import type { StreamlangResolverOptions } from '../../../types/resolvers';
import type { StreamlangDSL } from '../../../types/streamlang';
import type { Condition } from '../../../types/conditions';
export { conditionToESQLAst } from './condition_to_esql';
export interface ESQLTranspilationOptions {
    pipeTab: BasicPrettyPrinterOptions['pipeTab'];
    sourceIndex?: string;
    limit?: number;
}
export interface ESQLTranspilationResult {
    query: string;
    commands: string[];
}
export declare const conditionToESQL: (condition: Condition) => string;
export declare const transpile: (streamlang: StreamlangDSL, transpilationOptions?: ESQLTranspilationOptions, resolverOptions?: StreamlangResolverOptions) => Promise<ESQLTranspilationResult>;
