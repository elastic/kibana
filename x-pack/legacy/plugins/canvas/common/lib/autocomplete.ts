/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
// @ts-ignore Untyped Library
import { parse, getByAlias as untypedGetByAlias } from '@kbn/interpreter/common';
import {
  ExpressionAST,
  ExpressionFunctionAST,
  ExpressionArgAST,
  CanvasFunction,
  CanvasArg,
  CanvasArgValue,
} from '../../types';

const MARKER = 'CANVAS_SUGGESTION_MARKER';

interface BaseSuggestion {
  text: string;
  start: number;
  end: number;
}

interface FunctionSuggestion extends BaseSuggestion {
  type: 'function';
  fnDef: CanvasFunction;
}

type ArgSuggestionValue = CanvasArgValue & {
  name: string;
};

interface ArgSuggestion extends BaseSuggestion {
  type: 'argument';
  argDef: ArgSuggestionValue;
}

interface ValueSuggestion extends BaseSuggestion {
  type: 'value';
}

export type AutocompleteSuggestion = FunctionSuggestion | ArgSuggestion | ValueSuggestion;

interface FnArgAtPosition {
  ast: ExpressionASTWithMeta;
  fnIndex: number;

  argName?: string;
  argIndex?: number;
  argStart?: number;
  argEnd?: number;
}

// If you parse an expression with the "addMeta" option it completely
// changes the type of returned object.  The following types
// enhance the existing AST types with the appropriate meta information
interface ASTMetaInformation<T> {
  start: number;
  end: number;
  text: string;
  node: T;
}

// Wraps ExpressionArg with meta or replace ExpressionAST with ExpressionASTWithMeta
type WrapExpressionArgWithMeta<T> = T extends ExpressionAST
  ? ExpressionASTWithMeta
  : ASTMetaInformation<T>;

type ExpressionArgASTWithMeta = WrapExpressionArgWithMeta<ExpressionArgAST>;

type Modify<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;

// Wrap ExpressionFunctionAST with meta and modify arguments to be wrapped with meta
type ExpressionFunctionASTWithMeta = Modify<
  ExpressionFunctionAST,
  {
    arguments: {
      [key: string]: ExpressionArgASTWithMeta[];
    };
  }
>;

// Wrap ExpressionFunctionAST with meta and modify chain to be wrapped with meta
type ExpressionASTWithMeta = ASTMetaInformation<
  Modify<
    ExpressionAST,
    {
      chain: Array<ASTMetaInformation<ExpressionFunctionASTWithMeta>>;
    }
  >
>;

// Typeguard for checking if ExpressionArg is a new expression
function isExpression(
  maybeExpression: ExpressionArgASTWithMeta
): maybeExpression is ExpressionASTWithMeta {
  return typeof maybeExpression.node === 'object';
}

// Overloads to change return type based on specs
function getByAlias(specs: CanvasFunction[], name: string): CanvasFunction;
// eslint-disable-next-line @typescript-eslint/unified-signatures
function getByAlias(specs: CanvasArg, name: string): CanvasArgValue;
function getByAlias(
  specs: CanvasFunction[] | CanvasArg,
  name: string
): CanvasFunction | CanvasArgValue {
  return untypedGetByAlias(specs, name);
}

/**
 * Generates the AST with the given expression and then returns the function and argument definitions
 * at the given position in the expression, if there are any.
 */
export function getFnArgDefAtPosition(
  specs: CanvasFunction[],
  expression: string,
  position: number
) {
  try {
    const ast: ExpressionASTWithMeta = parse(expression, {
      addMeta: true,
    }) as ExpressionASTWithMeta;

    const { ast: newAst, fnIndex, argName, argStart, argEnd } = getFnArgAtPosition(ast, position);
    const fn = newAst.node.chain[fnIndex].node;

    const fnDef = getByAlias(specs, fn.function);
    if (fnDef && argName) {
      const argDef = getByAlias(fnDef.args, argName);
      return { fnDef, argDef, argStart, argEnd };
    }
    return { fnDef };
  } catch (e) {
    // Fail silently
  }
  return {};
}

/**
 * Gets a list of suggestions for the given expression at the given position. It does this by
 * inserting a marker at the given position, then parsing the resulting expression. This way we can
 * see what the marker would turn into, which tells us what sorts of things to suggest. For
 * example, if the marker turns into a function name, then we suggest functions. If it turns into
 * an unnamed argument, we suggest argument names. If it turns into a value, we suggest values.
 */
export function getAutocompleteSuggestions(
  specs: CanvasFunction[],
  expression: string,
  position: number
): AutocompleteSuggestion[] {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text, { addMeta: true }) as ExpressionASTWithMeta;
    const { ast: newAst, fnIndex, argName, argIndex } = getFnArgAtPosition(ast, position);
    const fn = newAst.node.chain[fnIndex].node;

    if (fn.function.includes(MARKER)) {
      return getFnNameSuggestions(specs, newAst, fnIndex);
    }

    if (argName === '_' && argIndex !== undefined) {
      return getArgNameSuggestions(specs, newAst, fnIndex, argName, argIndex);
    }

    if (argName && argIndex !== undefined) {
      return getArgValueSuggestions(specs, newAst, fnIndex, argName, argIndex);
    }
  } catch (e) {
    // Fail silently
  }
  return [];
}

/**
    Each entry of the node.chain has it's overall start and end position.  For instance,
    given the expression "link arg='something' | render" the link functions start position is 0 and end
    position is 21.

    This function is given the full ast and the current cursor position in the expression string.

    It returns which function the cursor is in, as well as which argument for that function the cursor is in
    if any.
*/
function getFnArgAtPosition(ast: ExpressionASTWithMeta, position: number): FnArgAtPosition {
  const fnIndex = ast.node.chain.findIndex(fn => fn.start <= position && position <= fn.end);
  const fn = ast.node.chain[fnIndex];
  for (const [argName, argValues] of Object.entries(fn.node.arguments)) {
    for (let argIndex = 0; argIndex < argValues.length; argIndex++) {
      const value = argValues[argIndex];

      let argStart = value.start;
      let argEnd = value.end;
      if (argName !== '_') {
        // If an arg name is specified, expand our start position to include
        // the arg name plus the `=` character
        argStart = argStart - (argName.length + 1);

        // If the arg value is an expression, expand our start and end position
        // to include the opening and closing braces
        if (value.node !== null && isExpression(value)) {
          argStart--;
          argEnd++;
        }
      }

      if (argStart <= position && position <= argEnd) {
        // If the current position is on an expression and NOT on the expression's
        // argument name (`font=` for example), recurse within the expression
        if (
          value.node !== null &&
          isExpression(value) &&
          (argName === '_' || !(argStart <= position && position <= argStart + argName.length + 1))
        ) {
          return getFnArgAtPosition(value, position);
        }
        return { ast, fnIndex, argName, argIndex, argStart, argEnd };
      }
    }
  }
  return { ast, fnIndex };
}

function getFnNameSuggestions(
  specs: CanvasFunction[],
  ast: ExpressionASTWithMeta,
  fnIndex: number
): FunctionSuggestion[] {
  // Filter the list of functions by the text at the marker
  const { start, end, node: fn } = ast.node.chain[fnIndex];
  const query = fn.function.replace(MARKER, '');
  const matchingFnDefs = specs.filter(({ name }) => textMatches(name, query));

  // Sort by whether or not the function expects the previous function's return type, then by
  // whether or not the function name starts with the text at the marker, then alphabetically
  const prevFn = ast.node.chain[fnIndex - 1];

  const prevFnDef = prevFn && getByAlias(specs, prevFn.node.function);
  const prevFnType = prevFnDef && prevFnDef.type;
  const comparator = combinedComparator<CanvasFunction>(
    prevFnTypeComparator(prevFnType),
    invokeWithProp<string, 'name', CanvasFunction, number>(startsWithComparator(query), 'name'),
    invokeWithProp<string, 'name', CanvasFunction, number>(alphanumericalComparator, 'name')
  );
  const fnDefs = matchingFnDefs.sort(comparator);

  return fnDefs.map(fnDef => {
    return { type: 'function', text: fnDef.name + ' ', start, end: end - MARKER.length, fnDef };
  });
}

function getArgNameSuggestions(
  specs: CanvasFunction[],
  ast: ExpressionASTWithMeta,
  fnIndex: number,
  argName: string,
  argIndex: number
): ArgSuggestion[] {
  // Get the list of args from the function definition
  const fn = ast.node.chain[fnIndex].node;
  const fnDef = getByAlias(specs, fn.function);
  if (!fnDef) {
    return [];
  }

  // We use the exact text instead of the value because it is always a string and might be quoted
  const { text, start, end } = fn.arguments[argName][argIndex];

  // Filter the list of args by the text at the marker
  const query = text.replace(MARKER, '');
  const matchingArgDefs = Object.entries<CanvasArgValue>(fnDef.args).filter(([name]) =>
    textMatches(name, query)
  );

  // Filter the list of args by those which aren't already present (unless they allow multi)
  const argEntries = Object.entries(fn.arguments).map<[string, ExpressionArgASTWithMeta[]]>(
    ([name, values]) => {
      return [name, values.filter(value => !value.text.includes(MARKER))];
    }
  );

  const unusedArgDefs = matchingArgDefs.filter(([matchingArgName, matchingArgDef]) => {
    if (matchingArgDef.multi) {
      return true;
    }
    return !argEntries.some(([name, values]) => {
      return (
        values.length > 0 &&
        (name === matchingArgName || (matchingArgDef.aliases || []).includes(name))
      );
    });
  });

  // Sort by whether or not the arg is also the unnamed, then by whether or not the arg name starts
  // with the text at the marker, then alphabetically
  const comparator = combinedComparator(
    unnamedArgComparator,
    invokeWithProp<string, 'name', CanvasArgValue & { name: string }, number>(
      startsWithComparator(query),
      'name'
    ),
    invokeWithProp<string, 'name', CanvasArgValue & { name: string }, number>(
      alphanumericalComparator,
      'name'
    )
  );
  const argDefs = unusedArgDefs.map(([name, arg]) => ({ name, ...arg })).sort(comparator);

  return argDefs.map(argDef => {
    return { type: 'argument', text: argDef.name + '=', start, end: end - MARKER.length, argDef };
  });
}

function getArgValueSuggestions(
  specs: CanvasFunction[],
  ast: ExpressionASTWithMeta,
  fnIndex: number,
  argName: string,
  argIndex: number
): ValueSuggestion[] {
  // Get the list of values from the argument definition
  const fn = ast.node.chain[fnIndex].node;
  const fnDef = getByAlias(specs, fn.function);
  if (!fnDef) {
    return [];
  }
  const argDef = getByAlias(fnDef.args, argName);
  if (!argDef) {
    return [];
  }

  // Get suggestions from the argument definition, including the default
  const { start, end, node } = fn.arguments[argName][argIndex];
  if (typeof node !== 'string') {
    return [];
  }
  const query = node.replace(MARKER, '');
  const argOptions = argDef.options ? argDef.options : [];

  let suggestions = [...argOptions];

  if (argDef.default !== undefined) {
    suggestions.push(argDef.default);
  }

  suggestions = uniq(suggestions);

  // Filter the list of suggestions by the text at the marker
  const filtered = suggestions.filter(option => textMatches(String(option), query));

  // Sort by whether or not the value starts with the text at the marker, then alphabetically
  const comparator = combinedComparator<any>(startsWithComparator(query), alphanumericalComparator);
  const sorted = filtered.sort(comparator);

  return sorted.map(value => {
    const text = maybeQuote(value) + ' ';
    return { start, end: end - MARKER.length, type: 'value', text };
  });
}

function textMatches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase().trim());
}

function maybeQuote(value: any) {
  if (typeof value === 'string') {
    if (value.match(/^\{.*\}$/)) {
      return value;
    }
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function prevFnTypeComparator(prevFnType: any) {
  return (a: CanvasFunction, b: CanvasFunction): number => {
    return (
      (b.context && b.context.types && b.context.types.includes(prevFnType) ? 1 : 0) -
      (a.context && a.context.types && a.context.types.includes(prevFnType) ? 1 : 0)
    );
  };
}

function unnamedArgComparator(a: CanvasArgValue, b: CanvasArgValue): number {
  return (
    (b.aliases && b.aliases.includes('_') ? 1 : 0) - (a.aliases && a.aliases.includes('_') ? 1 : 0)
  );
}

function alphanumericalComparator(a: any, b: any): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function startsWithComparator(query: string) {
  return (a: any, b: any) =>
    (String(b).startsWith(query) ? 1 : 0) - (String(a).startsWith(query) ? 1 : 0);
}

type Comparator<T> = (a: T, b: T) => number;

function combinedComparator<T>(...comparators: Array<Comparator<T>>): Comparator<T> {
  return (a: T, b: T) =>
    comparators.reduce((acc: number, comparator) => {
      if (acc !== 0) {
        return acc;
      }
      return comparator(a, b);
    }, 0);
}

function invokeWithProp<
  PropType,
  PropName extends string,
  ArgType extends { [key in PropName]: PropType },
  FnReturnType
>(fn: (...args: PropType[]) => FnReturnType, prop: PropName): (...args: ArgType[]) => FnReturnType {
  return (...args: Array<{ [key in PropName]: PropType }>) => {
    return fn(...args.map(arg => arg[prop]));
  };
}
