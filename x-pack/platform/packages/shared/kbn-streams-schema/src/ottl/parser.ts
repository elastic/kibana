/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// src/parser.ts

import { CharStreams, CommonTokenStream } from 'antlr4';
import { default as OttlLexer } from './antlr/OttlLexer';
import { default as OttlParser, StatementContext } from './antlr/OttlParser';
import { AstBuilderVisitor } from './ast_builder_visitor';
import { OTTLErrorListener } from './ast_error_listener';
import * as AST from './types';

export interface ParseResult {
  ast?: AST.Statement;
  errors: string[];
}

export function parseOttl(ottlScript: string): ParseResult {
  const inputStream = CharStreams.fromString(ottlScript);
  const lexer = new OttlLexer(inputStream);
  lexer.removeErrorListeners(); // Remove default console listener
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new OttlParser(tokenStream);
  parser.removeErrorListeners(); // Remove default console listener

  const errorListener = new OTTLErrorListener();
  parser.addErrorListener(errorListener);
  lexer.addErrorListener(errorListener); // Also catch lexer errors

  // Start parsing from the 'statement' rule
  const parseTree: StatementContext = parser.statement();

  if (errorListener.getErrors().length > 0) {
    return { errors: errorListener.getErrors().map((e) => e.message) };
  }

  // If no syntax errors, build the AST
  const visitor = new AstBuilderVisitor();
  const ast = visitor.visit(parseTree) as AST.Statement; // Cast the result

  // --- Semantic Checks (Post-AST) ---
  // Example: Check if editor has keys (which is disallowed by Go code logic)
  // This requires walking the generated AST.
  const semanticErrors = checkForSemanticErrors(ast);
  if (semanticErrors.length > 0) {
    return { ast, errors: semanticErrors }; // Return AST but also errors
  }

  return { ast, errors: [] };
}

// Example Semantic Checker function (you'd expand this)
function checkForSemanticErrors(ast: AST.Statement): string[] {
  const errors: string[] = [];

  // Check: Editor names must be lowercase (already enforced by parser/lexer rule)
  // Check: Converter names must be uppercase (already enforced by parser/lexer rule)

  // Check: Editors cannot have keys (indexing)
  // This check wasn't directly in the Go parser grammar but in a visitor.
  // We assume the AST reflects the grammar where editor doesn't have a 'keys' property.
  // If the grammar *allowed* keys syntactically, we'd check here:
  // if (ast.editor.keys && ast.editor.keys.length > 0) {
  //    errors.push(`Error: Editor '${ast.editor.function}' cannot be indexed.`);
  // }

  // Check: Math expressions cannot contain editors (lowercase function calls)
  // This requires traversing the MathExpression parts of the AST.
  function checkMathNode(node: AST.MathExpression | AST.MathTerm | AST.MathFactor) {
    if (!node) return;
    switch (node.type) {
      case 'MathAddSubExpression':
      case 'MathMulDivExpression':
        checkMathNode(node.left);
        checkMathNode(node.right);
        break;
      case 'MathParenExpression':
        checkMathNode(node.expression);
        break;
      // MathFactor types:
      case 'Path':
      case 'Converter':
      case 'Literal':
        // These are allowed
        break;
      // If grammar allowed Editor here, we would check:
      // case 'Editor':
      //    errors.push(`Error: Editor call '${node.function}' found within a math expression.`);
      //    break;
    }
  }
  // You would need to find all MathExpressions within the main AST (e.g., in arguments, comparisons)
  // and call checkMathNode on them. This is simplified here.

  // Check: Converter names used inside constExpr (boolean context) must be uppercase
  // This is enforced by the grammar/AST structure already.

  return errors;
}

// Example Usage:
// const ottl = `set(attributes["foo"], "bar") where name == "my-span" and attributes["http.status_code"] >= 500`;
// const result = parseOttl(ottl);
// if (result.errors.length > 0) {
//     console.error("Parsing Errors:", result.errors);
// } else {
//     console.log("Parsed AST:", JSON.stringify(result.ast, null, 2));
// }

// const ottlMath = `set(value, 1 + resource.attributes["cores"] * 2) where IsMatch(name, "test.*")`;
// const resultMath = parseOttl(ottlMath);
// // ... handle result ...

// const ottlBytes = `set(attributes["bytes"], 0xdeadbeef)`;
// const resultBytes = parseOttl(ottlBytes);
// // ... handle result ... (Uint8Array won't JSON stringify nicely by default)
