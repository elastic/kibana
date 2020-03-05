/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
// @ts-ignore Untyped Library
import { parse } from '@kbn/interpreter/common';
import {
  ExpressionAstExpression,
  ExpressionAstFunction,
  ExpressionAstArgument,
  ExpressionFunction,
  ExpressionFunctionParameter,
  getByAlias,
} from '../../../../../../src/plugins/expressions';

const MARKER = 'CANVAS_SUGGESTION_MARKER';

interface BaseSuggestion {
  text: string;
  start: number;
  end: number;
}

export interface FunctionSuggestion extends BaseSuggestion {
  type: 'function';
  fnDef: ExpressionFunction;
}

interface ArgSuggestionValue extends Omit<ExpressionFunctionParameter, 'accepts'> {
  name: string;
}

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

  // If this function is a sub-expression function, we need the parent function and argument
  // name to determine the return type of the function
  parentFn?: string;
  // If this function is a sub-expression function, the context could either be local or it
  // could be the parent's previous function.
  contextFn?: string | null;
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

// Wraps ExpressionArg with meta or replace ExpressionAstExpression with ExpressionASTWithMeta
type WrapExpressionArgWithMeta<T> = T extends ExpressionAstExpression
  ? ExpressionASTWithMeta
  : ASTMetaInformation<T>;

type ExpressionArgASTWithMeta = WrapExpressionArgWithMeta<ExpressionAstArgument>;

type Modify<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;

// Wrap ExpressionFunctionAST with meta and modify arguments to be wrapped with meta
type ExpressionFunctionASTWithMeta = Modify<
  ExpressionAstFunction,
  {
    arguments: {
      [key: string]: ExpressionArgASTWithMeta[];
    };
  }
>;

// Wrap ExpressionFunctionAST with meta and modify chain to be wrapped with meta
type ExpressionASTWithMeta = ASTMetaInformation<
  Modify<
    ExpressionAstExpression,
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

/**
 * Generates the AST with the given expression and then returns the function and argument definitions
 * at the given position in the expression, if there are any.
 */
export function getFnArgDefAtPosition(
  specs: ExpressionFunction[],
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
  specs: ExpressionFunction[],
  expression: string,
  position: number
): AutocompleteSuggestion[] {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text, { addMeta: true }) as ExpressionASTWithMeta;
    const { ast: newAst, fnIndex, argName, argIndex, parentFn, contextFn } = getFnArgAtPosition(
      ast,
      position
    );
    const fn = newAst.node.chain[fnIndex].node;

    if (parentFn && fn.function.includes(MARKER) && argName) {
      // We are in a sub-function like `plot font={}`
      return getSubFnNameSuggestions(specs, newAst, fnIndex, parentFn, argName, contextFn);
    }

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

    If the expression is found in a sub-expression, this identifies the argument name for return type checking.
    It also identifies the context function, which may not be the same as the current function.
    In this example:

    `math "random()" | progress label={as "value" | math "divide(value, 2)" | formatnumber "0%"}`

    The return value of the `label` function is always expected to be a string or boolean.
    The context function for the first expression in the chain is `math`, since it's the parent's previous
    item. The context function for `formatnumber` is the return of `math "divide(value, 2)"`.
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
          const result = getFnArgAtPosition(value, position);
          if (!result.argName) {
            const contextFn =
              result.fnIndex === 0
                ? fnIndex > 0
                  ? ast.node.chain[fnIndex - 1].node.function
                  : null
                : result.ast.node.chain[result.fnIndex - 1].node.function;
            return {
              ...result,
              argName,
              argIndex,
              argStart,
              argEnd,
              parentFn: fn.node.function,
              contextFn,
            };
          }
          return result;
        }
        return { ast, fnIndex, argName, argIndex, argStart, argEnd };
      }
    }
  }
  return { ast, fnIndex };
}

function getFnNameSuggestions(
  specs: ExpressionFunction[],
  ast: ExpressionASTWithMeta,
  fnIndex: number
): FunctionSuggestion[] {
  // Filter the list of functions by the text at the marker
  const { start, end } = ast.node.chain[fnIndex];

  // Sort by whether or not the function expects the previous function's return type, then by
  // whether or not the function name starts with the text at the marker, then alphabetically
  const prevFn = ast.node.chain[fnIndex - 1];
  const nextFn = ast.node.chain.length > fnIndex + 1 ? ast.node.chain[fnIndex + 1] : null;

  const prevFnDef = prevFn && getByAlias(specs, prevFn.node.function);
  const prevFnType = prevFnDef && prevFnDef.type;

  const nextFnDef = nextFn && getByAlias(specs, nextFn.node.function);
  const nextFnInputTypes = nextFnDef && nextFnDef.inputTypes;

  const fnDefs = specs.sort((a: ExpressionFunction, b: ExpressionFunction): number => {
    const aScore = getScore(a, prevFnType, nextFnInputTypes, false);
    const bScore = getScore(b, prevFnType, nextFnInputTypes, false);

    if (aScore === bScore) {
      return a.name < b.name ? -1 : 1;
    }
    return aScore > bScore ? -1 : 1;
  });

  return fnDefs.map(fnDef => {
    return { type: 'function', text: `${fnDef.name} `, start, end: end - MARKER.length, fnDef };
  });
}

function getSubFnNameSuggestions(
  specs: ExpressionFunction[],
  ast: ExpressionASTWithMeta,
  fnIndex: number,
  parentFn: string,
  parentFnArgName: string,
  contextFn?: string | null
): FunctionSuggestion[] {
  // Filter the list of functions by the text at the marker
  const { start, end, node: fn } = ast.node.chain[fnIndex];
  const query = fn.function.replace(MARKER, '');
  const matchingFnDefs = specs.filter(({ name }) => textMatches(name, query));

  const parentFnDef = getByAlias(specs, parentFn);
  const matchingArgDef = getByAlias(parentFnDef!.args, parentFnArgName);

  if (!matchingArgDef) {
    return [];
  }

  const contextFnDef = contextFn ? getByAlias(specs, contextFn) : null;
  const contextFnType = contextFnDef && contextFnDef.type;

  const expectedReturnTypes = matchingArgDef.types;

  const fnDefs = matchingFnDefs.sort((a: ExpressionFunction, b: ExpressionFunction) => {
    const aScore = getScore(a, contextFnType, expectedReturnTypes, true);
    const bScore = getScore(b, contextFnType, expectedReturnTypes, true);

    if (aScore === bScore) {
      return a.name < b.name ? -1 : 1;
    }
    return aScore > bScore ? -1 : 1;
  });

  return fnDefs.map(fnDef => {
    return { type: 'function', text: fnDef.name + ' ', start, end: end - MARKER.length, fnDef };
  });
}

function getScore(
  func: ExpressionFunction,
  contextType: any,
  returnTypes?: any[] | null,
  isSubFunc?: boolean
) {
  let score = 0;
  if (!contextType) {
    contextType = 'null';
  }

  const inputTypesNormalized = (func.inputTypes || []) as string[];

  if (isSubFunc) {
    if (returnTypes && func.type) {
      // If in a sub-expression, favor types that match the expected return type for the argument
      // with top results matching the passed in context
      if (returnTypes.length && returnTypes.includes(func.type)) {
        score++;

        if (inputTypesNormalized.includes(contextType)) {
          score++;
        }
      }
    }
  } else {
    if (func.inputTypes) {
      const expectsNull = inputTypesNormalized.includes('null');

      if (!expectsNull && contextType !== 'null') {
        // If not in a sub-expression and there's a preceding function,
        // favor functions that expect a context with top results matching the passed in context
        score++;

        if (func.inputTypes.includes(contextType)) {
          score++;
        }
      } else if (expectsNull && contextType === 'null') {
        // If not in a sub-expression and there's NOT a preceding function,
        // favor functions that don't expect anything being passed in with top results returning a non-null
        score++;

        if (func.type && func.type !== 'null') {
          score++;
        }
      }
    }
  }

  return score;
}

function getArgNameSuggestions(
  specs: ExpressionFunction[],
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
  const { start, end } = fn.arguments[argName][argIndex];

  // Filter the list of args by those which aren't already present (unless they allow multi)
  const argEntries = Object.entries(fn.arguments).map<[string, ExpressionArgASTWithMeta[]]>(
    ([name, values]) => {
      return [name, values.filter(value => !value.text.includes(MARKER))];
    }
  );

  const unusedArgDefs = Object.entries(fnDef.args).filter(([matchingArgName, matchingArgDef]) => {
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

  const argDefs: ArgSuggestionValue[] = unusedArgDefs
    .map(([name, arg]) => ({ name, ...arg }))
    .sort(unnamedArgComparator);

  return argDefs.map(argDef => {
    return {
      type: 'argument',
      text: argDef.name + '=',
      start,
      end: end - MARKER.length,
      argDef,
    };
  });
}

function getArgValueSuggestions(
  specs: ExpressionFunction[],
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
  const argOptions = argDef.options ? argDef.options : [];

  const suggestions = [...argOptions];

  if (argDef.default !== undefined) {
    suggestions.push(argDef.default);
  }

  return uniq(suggestions).map(value => {
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

function unnamedArgComparator(a: { aliases?: string[] }, b: { aliases?: string[] }): number {
  return (
    (b.aliases && b.aliases.includes('_') ? 1 : 0) - (a.aliases && a.aliases.includes('_') ? 1 : 0)
  );
}
