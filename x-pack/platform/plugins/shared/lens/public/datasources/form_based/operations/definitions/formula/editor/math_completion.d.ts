import { monaco } from '@kbn/monaco';
import type { TinymathAST, TinymathFunction, TinymathNamedArgument } from '@kbn/tinymath';
import type { KqlPluginStart, QuerySuggestion } from '@kbn/kql/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DateRange, IndexPattern } from '@kbn/lens-common';
import type { GenericOperationDefinition } from '../..';
export declare enum SUGGESTION_TYPE {
    FIELD = "field",
    NAMED_ARGUMENT = "named_argument",
    FUNCTIONS = "functions",
    KQL = "kql",
    SHIFTS = "shifts",
    REDUCED_TIME_RANGES = "reducedTimeRanges"
}
export type LensMathSuggestion = string | {
    label: string;
    type: 'operation' | 'math';
} | QuerySuggestion;
export interface LensMathSuggestions {
    list: LensMathSuggestion[];
    type: SUGGESTION_TYPE;
    range?: monaco.IRange;
}
export declare const MARKER = "LENS_MATH_MARKER";
export declare function getInfoAtZeroIndexedPosition(ast: TinymathAST, zeroIndexedPosition: number, parent?: TinymathFunction): undefined | {
    ast: TinymathAST;
    parent?: TinymathFunction;
};
export declare function createEditOperation(textToInject: string, currentPosition: monaco.IRange, startOffset?: number, endOffset?: number): {
    range: {
        startColumn: number;
        endColumn: number;
        startLineNumber: number;
        endLineNumber: number;
    };
    text: string;
};
export declare function offsetToRowColumn(expression: string, offset: number): monaco.Position;
export declare function monacoPositionToOffset(expression: string, position: monaco.Position): number;
export declare function suggest({ expression, zeroIndexedOffset, context, indexPattern, operationDefinitionMap, dataViews, kql, dateHistogramInterval, timefilter, }: {
    expression: string;
    zeroIndexedOffset: number;
    context: monaco.languages.CompletionContext;
    indexPattern: IndexPattern;
    operationDefinitionMap: Record<string, GenericOperationDefinition>;
    kql: KqlPluginStart;
    dataViews: DataViewsPublicPluginStart;
    dateHistogramInterval?: number;
    timefilter: TimefilterContract;
}): Promise<LensMathSuggestions>;
export declare function getPossibleFunctions(indexPattern: IndexPattern, operationDefinitionMap?: Record<string, GenericOperationDefinition>): string[];
export declare function getNamedArgumentSuggestions({ ast, kql, dataViews, indexPattern, dateHistogramInterval, dateRange, }: {
    ast: TinymathNamedArgument;
    indexPattern: IndexPattern;
    kql: KqlPluginStart;
    dataViews: DataViewsPublicPluginStart;
    dateHistogramInterval?: number;
    dateRange: DateRange;
}): Promise<{
    list: string[];
    type: SUGGESTION_TYPE;
} | {
    list: QuerySuggestion[];
    type: SUGGESTION_TYPE;
}>;
export declare function getSuggestion(suggestion: LensMathSuggestion, type: SUGGESTION_TYPE, operationDefinitionMap: Record<string, GenericOperationDefinition>, triggerChar: string | undefined, range?: monaco.IRange): monaco.languages.CompletionItem;
export declare function getSignatureHelp(expression: string, position: number, operationDefinitionMap: Record<string, GenericOperationDefinition>): monaco.languages.SignatureHelpResult;
export declare function getHover(expression: string, position: number, operationDefinitionMap: Record<string, GenericOperationDefinition>): monaco.languages.Hover;
export declare function getTokenInfo(expression: string, position: number): {
    ast: TinymathAST;
    parent?: TinymathFunction;
} | undefined;
