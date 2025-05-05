/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import * as AST from './types';
import { replaceSemanticNames } from './grok/parser';

interface CompilerContext {
  tmpVarCounter: number;
}

export function compile(statement: AST.Statement): IngestProcessorContainer[] {
  const processors: IngestProcessorContainer[] = [];
  const context: CompilerContext = { tmpVarCounter: 0 };
  // Traverse the AST in post-order to compile OTTL to processors.
  postOrderTraverse(statement, processors, context);
  // remove all tmp variables
  processors.push({
    remove: {
      field: new Array(context.tmpVarCounter).fill(0).map((_, i) => `tmp_${i}`),
      ignore_failure: true,
    },
  });
  return processors;
}

// Post-order traversal function for AST nodes.
function postOrderTraverse(
  node: AST.AstNode,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode {
  // modified signature
  switch (node.type) {
    case 'Statement':
      {
        const stmt = node as AST.Statement;
        stmt.editor = postOrderTraverse(stmt.editor, processors, context) as AST.Editor;
        if (stmt.whereClause) {
          stmt.whereClause = postOrderTraverse(
            stmt.whereClause,
            processors,
            context
          ) as AST.WhereClause;
        }
        const replaced = visitStatement(stmt, processors, context);
        node = replaced !== undefined ? replaced : stmt;
      }
      break;
    case 'Editor':
      {
        const editor = node as AST.Editor;
        editor.arguments = editor.arguments.map(
          (arg) => postOrderTraverse(arg, processors, context) as AST.Argument
        );
        const replaced = visitEditor(editor, processors, context);
        node = replaced !== undefined ? replaced : editor;
      }
      break;
    case 'WhereClause':
      {
        const where = node as AST.WhereClause;
        where.expression = postOrderTraverse(
          where.expression,
          processors,
          context
        ) as AST.BooleanExpression;
        const replaced = visitWhereClause(where, processors, context);
        node = replaced !== undefined ? replaced : where;
      }
      break;
    case 'Argument':
      {
        const argument = node as AST.Argument;
        argument.value = postOrderTraverse(argument.value, processors, context) as AST.Value;
        const replaced = visitArgument(argument, processors, context);
        node = replaced !== undefined ? replaced : argument;
      }
      break;
    case 'Converter':
      {
        const converter = node as AST.Converter;
        converter.arguments = converter.arguments.map(
          (arg) => postOrderTraverse(arg, processors, context) as AST.Argument
        );
        converter.keys = converter.keys.map(
          (key) => postOrderTraverse(key, processors, context) as AST.KeyAccess
        );
        const replaced = visitConverter(converter, processors, context);
        node = replaced !== undefined ? replaced : converter;
      }
      break;
    case 'BooleanAndExpression':
    case 'BooleanOrExpression':
      {
        (node as any).left = postOrderTraverse((node as any).left, processors, context);
        (node as any).right = postOrderTraverse((node as any).right, processors, context);
        const replaced = visitBooleanExpression(node, processors, context);
        node = replaced !== undefined ? replaced : node;
      }
      break;
    case 'BooleanPrimaryExpression':
      {
        const bp = node as AST.BooleanPrimaryExpression;
        bp.value = postOrderTraverse(bp.value, processors, context) as AST.BooleanParenExpression;
        const replaced = visitBooleanPrimary(bp, processors, context);
        node = replaced !== undefined ? replaced : bp;
      }
      break;
    case 'BooleanParenExpression':
      {
        const bp = node as AST.BooleanParenExpression;
        bp.expression = postOrderTraverse(
          bp.expression,
          processors,
          context
        ) as AST.BooleanExpression;
        const replaced = visitBooleanParen(bp, processors, context);
        node = replaced !== undefined ? replaced : bp;
      }
      break;
    case 'Comparison':
      {
        const comp = node as AST.Comparison;
        comp.left = postOrderTraverse(comp.left, processors, context) as AST.Value;
        comp.right = postOrderTraverse(comp.right, processors, context) as AST.Value;
        const replaced = visitComparison(comp, processors, context);
        node = replaced !== undefined ? replaced : comp;
      }
      break;
    case 'Path':
      {
        const path = node as AST.Path;
        path.fields = path.fields.map(
          (field) => postOrderTraverse(field, processors, context) as AST.Field
        );
        const replaced = visitPath(path, processors, context);
        node = replaced !== undefined ? replaced : path;
      }
      break;
    case 'Field':
      {
        const field = node as AST.Field;
        field.keys = field.keys.map(
          (key) => postOrderTraverse(key, processors, context) as AST.KeyAccess
        );
        const replaced = visitField(field, processors, context);
        node = replaced !== undefined ? replaced : field;
      }
      break;
    case 'KeyAccess':
      {
        const keyAccess = node as AST.KeyAccess;
        keyAccess.key = postOrderTraverse(
          keyAccess.key as AST.AstNode,
          processors,
          context
        ) as AST.Value;
        const replaced = visitKeyAccess(keyAccess, processors, context);
        node = replaced !== undefined ? replaced : keyAccess;
      }
      break;
    case 'Map':
      {
        const mapNode = node as AST.MapNode;
        mapNode.entries = new Map(
          Object.entries(mapNode.entries).map(([k, entry]) => [
            k,
            postOrderTraverse(entry, processors, context) as AST.Value,
          ])
        );
        const replaced = visitMap(mapNode, processors, context);
        node = replaced !== undefined ? replaced : mapNode;
      }
      break;
    case 'List':
      {
        const listNode = node as AST.ListNode;
        listNode.values = listNode.values.map(
          (val) => postOrderTraverse(val, processors, context) as AST.Value
        );
        const replaced = visitList(listNode, processors, context);
        node = replaced !== undefined ? replaced : listNode;
      }
      break;
    case 'MathAddSubExpression':
      {
        const expr = node as AST.MathAddSubExpression;
        expr.left = postOrderTraverse(expr.left, processors, context) as AST.MathExpression;
        expr.right = postOrderTraverse(expr.right, processors, context) as AST.MathExpression;
        const replaced = visitMathAddSub(expr, processors, context);
        node = replaced !== undefined ? replaced : expr;
      }
      break;
    case 'MathMulDivExpression':
      {
        const expr = node as AST.MathMulDivExpression;
        expr.left = postOrderTraverse(expr.left, processors, context) as AST.MathTerm;
        expr.right = postOrderTraverse(expr.right, processors, context) as AST.MathTerm;
        const replaced = visitMathMulDiv(expr, processors, context);
        node = replaced !== undefined ? replaced : expr;
      }
      break;
    case 'MathParenExpression':
      {
        const expr = node as AST.MathParenExpression;
        expr.expression = postOrderTraverse(
          expr.expression,
          processors,
          context
        ) as AST.MathExpression;
        const replaced = visitMathParen(expr, processors, context);
        node = replaced !== undefined ? replaced : expr;
      }
      break;
    default:
      {
        const replaced = visitNode(node, processors, context);
        node = replaced !== undefined ? replaced : node;
      }
      break;
  }
  return node;
}

// Visitor functions for each AST node type (scaffold implementations)
function visitStatement(
  node: AST.Statement,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for Statement using context.tmpVarCounter if needed
}

function visitEditor(
  node: AST.Editor,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  if (node.function === 'set') {
    const firstArg = node.arguments[0].value;
    const secondArg = node.arguments[1].value;
    if (firstArg.type !== 'IngestPipelineRef') {
      throw new Error(
        `Expected first argument to be IngestPipelineRef converted from a path, found: ${firstArg.type}`
      );
    }
    if (secondArg.type !== 'IngestPipelineRef' && secondArg.type !== 'Literal') {
      throw new Error(
        `Expected second argument to be IngestPipelineRef or Literal, found: ${secondArg.type}`
      );
    }
    // both arguments need to be refs at this point
    const target = firstArg;
    if (secondArg.type === 'IngestPipelineRef') {
      // if the second argument is a reference, we need to set it to the value of the first
      if (!secondArg.isValue) {
        processors.push(resolveIngestPipelineRef(secondArg));
      }
    }
    if (secondArg.type === 'IngestPipelineRef') {
      processors.push({
        set: {
          field: `{{{${target.name}}}}`,
          copy_from: secondArg.name,
        },
      });
    } else {
      processors.push({
        set: {
          field: `{{{${target.name}}}}`,
          value: secondArg.value,
        },
      });
    }
  }
  if (node.function === 'delete_key') {
    const firstArg = node.arguments[0].value;
    const secondArg = node.arguments[1].value;
    if (firstArg.type !== 'IngestPipelineRef') {
      throw new Error(
        `Expected first argument to be IngestPipelineRef converted from a path, found: ${firstArg.type}`
      );
    }
    if (secondArg.type !== 'IngestPipelineRef' && secondArg.type !== 'Literal') {
      throw new Error(
        `Expected second argument to be IngestPipelineRef or Literal, found: ${secondArg.type}`
      );
    }
    if (secondArg.type === 'IngestPipelineRef') {
      // if the second argument is a reference, we need to set it to the value of the first
      if (!secondArg.isValue) {
        processors.push(resolveIngestPipelineRef(secondArg));
      }
    }
    const value =
      secondArg.type === 'IngestPipelineRef' ? `{{{${secondArg.name}}}}` : secondArg.value;
    processors.push({
      remove: {
        field: `{{{${firstArg.name}}}}.${value}`,
        ignore_failure: true,
      },
    });
  }
  if (node.function === 'merge_maps') {
    const resultVarName = `tmp_${context.tmpVarCounter++}`;
    const targetArg = node.arguments[0].value;
    if (targetArg.type !== 'IngestPipelineRef' || targetArg.isValue) {
      throw new Error(
        `Expected first argument to be IngestPipelineRef from a path, found: ${targetArg.type}`
      );
    }
    const valueArg = node.arguments[1].value;
    if (valueArg.type === 'IngestPipelineRef') {
      if (!valueArg.isValue) {
        processors.push(resolveIngestPipelineRef(valueArg));
      }
    } else {
      throw new Error(`Expected second argument to be IngestPipelineRef, found: ${valueArg.type}`);
    }
    const strategyArg = node.arguments[2].value;
    if (strategyArg.type !== 'Literal' || typeof strategyArg.value !== 'string') {
      throw new Error(`Expected third argument to be a string literal, found: ${strategyArg.type}`);
    }
    const strategy = strategyArg.value;
    if (strategy === 'upsert') {
      // iterate over the keys of the value map and set them to the target map
      processors.push({
        script: {
          source: `
          ctx['${resultVarName}'] = $(ctx['${targetArg.name}'], null);
            if (ctx['${resultVarName}'] == null) {
              ctx['${resultVarName}'] = [:];
            }
          for (entry in ctx['${valueArg.name}']) {
            ctx['${resultVarName}'][entry] = ctx['${valueArg.name}'][entry];
          }
          `,
        },
      });
    } else if (strategy === 'insert') {
      // Insert the value from source into target where the key does not already exist
      processors.push({
        script: {
          source: `
            ctx['${resultVarName}'] = $(ctx['${targetArg.name}'], null);
            if (ctx['${resultVarName}'] == null) {
              ctx['${resultVarName}'] = [:];
            }
            for (entry in ctx['${valueArg.name}']) {
              if (ctx['${resultVarName}'][entry] == null) {
                ctx['${resultVarName}'][entry] = ctx['${valueArg.name}'][entry];
              }
            }
            `,
        },
      });
    } else if (strategy === 'update') {
      // Update the entry in target with the value from source where the key does exist
      processors.push({
        script: {
          source: `
            ctx['${resultVarName}'] = $(ctx['${targetArg.name}'], null);
            if (ctx['${resultVarName}'] == null) {
              ctx['${resultVarName}'] = [:];
            }
            for (entry in ctx['${valueArg.name}']) {
              if (ctx['${resultVarName}'][entry] != null) {
                ctx['${resultVarName}'][entry] = ctx['${valueArg.name}'][entry];
              }
            }
            `,
        },
      });
    } else {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    processors.push({
      set: {
        field: `{{{${targetArg.name}}}}`,
        copy_from: resultVarName,
      },
    });
  }
  // TODO: Implement compilation logic for Editor using context.tmpVarCounter if needed
}

function visitWhereClause(
  node: AST.WhereClause,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for WhereClause using context.tmpVarCounter if needed
}

function visitArgument(
  node: AST.Argument,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for Argument using context.tmpVarCounter if needed
}

function visitConverter(
  node: AST.Converter,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  if (node.function === 'ExtractGrokPatterns') {
    const targetArg = node.arguments[0].value;
    let target: string;
    if (targetArg.type === 'IngestPipelineRef') {
      if (!targetArg.isValue) {
        processors.push(resolveIngestPipelineRef(targetArg));
      }
      target = `{{{${targetArg.name}}}}`;
    } else {
      throw new Error('Target argument can not be a literal');
    }

    const patternArg = node.arguments[1].value;
    if (patternArg.type !== 'Literal' || typeof patternArg.value !== 'string') {
      throw new Error(`Expected first argument to be a string literal, found: ${patternArg.type}`);
    }
    const pattern = patternArg.value;

    const namedCapturesOnly = node.arguments[2].value;
    if (namedCapturesOnly.type !== 'Literal' || namedCapturesOnly.value !== true) {
      throw new Error('Named captures only must be enabled');
    }

    if (node.arguments.length > 3) {
      throw new Error('Custom definitions are not supported');
    }

    const semanticNameMap: Record<string, string> = {};

    const replacedPattern = replaceSemanticNames(pattern, (oldName) => {
      const newName = `tmp_${context.tmpVarCounter++}`;
      semanticNameMap[oldName] = newName;
      return newName;
    });

    processors.push({
      grok: {
        field: target,
        patterns: [replacedPattern],
        ignore_failure: true,
      },
    });
    const containerObjectName = `tmp_${context.tmpVarCounter++}`;
    processors.push({
      script: {
        source: `ctx['${containerObjectName}'] = [:];
        ${Object.entries(semanticNameMap)
          .map(([oldName, newName]) => {
            return `ctx['${containerObjectName}']['${oldName}'] = ctx['${newName}'];`;
          })
          .join('\n')}
        `,
      },
    });
    return {
      type: 'IngestPipelineRef',
      name: containerObjectName,
      isValue: true,
    } as AST.IngestPipelineRef; // Update the node to reference the tmp variable
  }
  // TODO: Implement compilation logic for Converter
}

function visitBooleanExpression(
  node: AST.BooleanExpression,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for BooleanAnd/Or expressions
}

function visitBooleanPrimary(
  node: AST.BooleanPrimaryExpression,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for BooleanPrimaryExpression
}

function visitBooleanParen(
  node: AST.BooleanParenExpression,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for BooleanParenExpression
}

function visitComparison(
  node: AST.Comparison,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for Comparison
}

function visitPath(
  node: AST.Path,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  const fieldAPIString = pathToFieldAPIString(node, processors);
  const tmpVarName = `tmp_${context.tmpVarCounter++}`;
  processors.push({
    set: {
      field: tmpVarName,
      value: fieldAPIString,
    },
  });
  return {
    type: 'IngestPipelineRef',
    name: tmpVarName,
    isValue: false,
  } as AST.IngestPipelineRef; // Update the node to reference the tmp variable
}

function visitField(
  node: AST.Field,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for Field
}

function visitKeyAccess(
  node: AST.KeyAccess,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for KeyAccess
}

function visitMap(
  node: AST.MapNode,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for MapNode
}

function visitList(
  node: AST.ListNode,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for ListNode
}

function visitMathAddSub(
  node: AST.MathAddSubExpression,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  const tmpVarName = `tmp_${context.tmpVarCounter++}`;
  const operation = node.operator;
  const left = node.left;
  const right = node.right;
  if (left.type !== 'IngestPipelineRef' && left.type !== 'Literal') {
    throw new Error(`Left operand must be IngestPipelineRef or Literal, found: ${left.type}`);
  }
  if (right.type !== 'IngestPipelineRef' && right.type !== 'Literal') {
    throw new Error(`Right operand must be IngestPipelineRef or Literal, found: ${right.type}`);
  }
  if (left.type === 'IngestPipelineRef' && !left.isValue) {
    processors.push(resolveIngestPipelineRef(left));
  }
  if (right.type === 'IngestPipelineRef' && !right.isValue) {
    processors.push(resolveIngestPipelineRef(right));
  }
  processors.push({
    script: {
      source: `ctx['${tmpVarName}'] = ${
        left.type === 'Literal' ? left.value : `ctx['${left.name}']`
      } ${operation} ${right.type === 'Literal' ? right.value : `ctx['${right.name}']`}`,
    },
  });
  return {
    type: 'IngestPipelineRef',
    name: tmpVarName,
    isValue: true,
  } as AST.IngestPipelineRef; // Update the node to reference the tmp variable
  // TODO: Implement compilation logic for MathAddSubExpression
}

function visitMathMulDiv(
  node: AST.MathMulDivExpression,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for MathMulDivExpression
}

function visitMathParen(
  node: AST.MathParenExpression,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Implement compilation logic for MathParenExpression
}

function visitNode(
  node: AST.AstNode,
  processors: IngestProcessorContainer[],
  context: CompilerContext
): AST.AstNode | void {
  // TODO: Generic visitor for nodes without a specific implementation
}

function resolveIngestPipelineRef(node: AST.IngestPipelineRef): IngestProcessorContainer {
  return {
    script: {
      source: `ctx['${node.name}'] = $(ctx['${node.name}'], null)`,
    },
  };
}

/**
 * Converts an AST Path object to a string representation that
 * works with the field API in Elasticsearch ingest processors.
 */
function pathToFieldAPIString(path: AST.Path, processors: IngestProcessorContainer[]): string {
  const parts: string[] = [];
  if (path.context) {
    parts.push(path.context);
  }
  path.fields.forEach((field) => {
    parts.push(field.name);
    field.keys.forEach((key) => {
      if (key.key.type === 'Literal') {
        const keyValue = key.key.value;
        if (typeof keyValue !== 'string') {
          throw new Error(`Key access must be a string literal, found: ${keyValue}`);
        }
        parts.push(keyValue);
      } else if (key.key.type === 'IngestPipelineRef') {
        const keyValue = key.key.name;
        if (!key.key.isValue) {
          processors.push(resolveIngestPipelineRef(key.key));
        }
        parts.push(`{{{${keyValue}}}}`);
      } else {
        throw new Error(`Key access must be a literal, found: ${key.key.type}`);
      }
    });
  });
  return parts.join('.');
}
