import type { TinymathAST, TinymathFunction, TinymathNamedArgument, TinymathVariable } from '@kbn/tinymath';
export type GroupedNodes = {
    [Key in TinymathNamedArgument['type']]: TinymathNamedArgument[];
} & {
    [Key in TinymathVariable['type']]: Array<TinymathVariable | string | number>;
} & {
    [Key in TinymathFunction['type']]: TinymathFunction[];
};
export type TinymathNodeTypes = Exclude<TinymathAST, number>;
