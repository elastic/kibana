/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// src/ast.ts

export type AstNode =
  | Statement
  | Editor
  | Converter
  | WhereClause
  | BooleanExpression
  | Comparison
  | Path
  | Field
  | KeyAccess
  | Argument
  | MapNode
  | ListNode
  | Literal;

export type LiteralValue = string | number | boolean | null | Uint8Array;

export interface Location {
  line: number;
  column: number;
}

export interface BaseNode {
  type: string;
  start?: Location; // Optional: Add location info if needed
  end?: Location;
}

export interface Statement extends BaseNode {
  type: 'Statement';
  editor: Editor;
  whereClause?: WhereClause;
}

export interface Editor extends BaseNode {
  type: 'Editor';
  function: string;
  arguments: Argument[];
}

export interface Converter extends BaseNode {
  type: 'Converter';
  function: string;
  arguments: Argument[];
  keys: KeyAccess[];
}

export interface Argument extends BaseNode {
  type: 'Argument';
  name?: string; // Optional named argument
  value: Value;
}

// Represents any kind of value node in the AST
export type Value = Literal | Path | Converter | MapNode | ListNode | MathExpression | EnumSymbol;

export interface WhereClause extends BaseNode {
  type: 'WhereClause';
  expression: BooleanExpression;
}

export type BooleanExpression =
  | BooleanAndExpression
  | BooleanOrExpression
  | BooleanPrimaryExpression;

export interface BooleanAndExpression extends BaseNode {
  type: 'BooleanAndExpression';
  left: BooleanExpression;
  right: BooleanExpression;
}
export interface BooleanOrExpression extends BaseNode {
  type: 'BooleanOrExpression';
  left: BooleanExpression;
  right: BooleanExpression;
}

export interface BooleanPrimaryExpression extends BaseNode {
  type: 'BooleanPrimaryExpression';
  negated: boolean;
  value: Comparison | Literal | Converter | BooleanParenExpression;
}

export interface BooleanParenExpression extends BaseNode {
  type: 'BooleanParenExpression';
  expression: BooleanExpression;
}

export interface Comparison extends BaseNode {
  type: 'Comparison';
  left: Value;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';
  right: Value;
}

export interface Path extends BaseNode {
  type: 'Path';
  context?: string; // e.g., 'resource', 'span'
  fields: Field[];
}

export interface Field extends BaseNode {
  type: 'Field';
  name: string;
  keys: KeyAccess[];
}

export interface KeyAccess extends BaseNode {
  type: 'KeyAccess';
  key: Value | Literal; // Can be String, Int, or evaluated expression/path/converter
}

export interface Literal extends BaseNode {
  type: 'Literal';
  value: LiteralValue;
}

export interface EnumSymbol extends BaseNode {
  type: 'EnumSymbol';
  symbol: string;
}

export interface MapNode extends BaseNode {
  type: 'Map';
  entries: Map<string, Value>; // Use a Map for easy lookup
}

export interface ListNode extends BaseNode {
  type: 'List';
  values: Value[];
}

// --- Math Expression Nodes ---
export type MathExpression = MathAddSubExpression | MathTerm;

export interface MathAddSubExpression extends BaseNode {
  type: 'MathAddSubExpression';
  left: MathExpression;
  operator: '+' | '-';
  right: MathExpression;
}

export type MathTerm = MathMulDivExpression | MathFactor;

export interface MathMulDivExpression extends BaseNode {
  type: 'MathMulDivExpression';
  left: MathTerm;
  operator: '*' | '/';
  right: MathTerm;
}

export type MathFactor = Literal | Path | Converter | MathParenExpression;

export interface MathParenExpression extends BaseNode {
  type: 'MathParenExpression';
  expression: MathExpression;
}

// Helper function to extract text, removing quotes for strings
export function unquoteString(quoted: string): string {
  if (quoted.startsWith('"') && quoted.endsWith('"')) {
    return quoted.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\'); // Basic unescaping
  }
  if (quoted.startsWith("'") && quoted.endsWith("'")) {
    // Handle single quotes if needed
    return quoted.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  return quoted;
}

// Helper function to parse Bytes literal
export function parseBytes(byteString: string): Uint8Array {
  const hex = byteString.startsWith('0x') ? byteString.substring(2) : byteString;
  if (hex.length % 2 !== 0) {
    console.warn(`Hex string has odd length: ${byteString}`);
    // Decide handling: error or padding? Padding might be wrong.
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
