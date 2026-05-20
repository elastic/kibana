import type { TinymathAST, TinymathFunction, TinymathNamedArgument, TinymathVariable } from '@kbn/tinymath';
import type { Query } from '@kbn/es-query';
import type { GenericIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition, GenericOperationDefinition } from '..';
export declare const unquotedStringRegex: RegExp;
export declare function groupArgsByType(args: TinymathAST[]): {
    namedArguments: TinymathNamedArgument[];
    variables: (string | number | TinymathVariable)[];
    functions: TinymathFunction[];
};
export declare function getValueOrName(node: TinymathAST): string | number;
export declare function mergeWithGlobalFilters(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, mappedParams: Record<string, string | number>, globalFilter?: Query, globalReducedTimeRange?: string): Record<string, string | number>;
export declare function getOperationParams(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, params?: TinymathNamedArgument[]): Record<string, string | number>;
export declare function isMathNode(node: TinymathAST | string): false | {
    section: "math" | "comparison";
    positionalArguments: Array<{
        name: string;
        optional?: boolean;
        defaultValue?: string | number;
        type?: string;
        alternativeWhenMissing?: string;
    }>;
    help: string;
    outputType?: string;
};
export declare function findMathNodes(root: TinymathAST | string): TinymathFunction[];
export declare function findVariables(node: TinymathAST | string): TinymathVariable[];
export declare function filterByVisibleOperation(operationDefinitionMap: Record<string, GenericOperationDefinition>): {
    [k: string]: GenericOperationDefinition;
};
