import type { conditionToESQLAst } from './condition_to_esql';
import type { ESQLTranspilationOptions } from '.';
import { type StreamlangProcessorDefinition } from '../../../types/processors';
import { type StreamlangResolverOptions } from '../../../types/resolvers';
export declare function convertStreamlangDSLToESQLCommands(actionSteps: StreamlangProcessorDefinition[], transpilationOptions: ESQLTranspilationOptions, resolverOptions?: StreamlangResolverOptions): Promise<string>;
/**
 * Converts a condition to ES|QL string format using the existing AST approach
 * @example: { field: "age", range: { gte: 18, lt: 65 } } -> "age >= 18 AND age < 65"
 */
export declare function convertConditionToESQL(condition: Parameters<typeof conditionToESQLAst>[0]): string;
