/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type {
  RenameProcessor,
  SetProcessor,
  GrokProcessor,
  DateProcessor,
  DissectProcessor,
  AppendProcessor,
} from '../../../types/processors';

import type { Condition } from '../../../types/conditions';
import {
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isAlwaysCondition,
} from '../../../types/conditions';

import type { ESQLTranspilationOptions } from '.';

// Helper to format values for ES|QL literal arguments (e.g., "string", true, 123)
function formatValueForESQLLiteral(value: any): string {
  if (typeof value === 'string') {
    return JSON.stringify(value); // Handles escaping quotes
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return JSON.stringify(value); // Fallback for objects/arrays if they can be compared
}

function conditionToESQL(condition: Condition): string {
  if (isFilterCondition(condition)) {
    const field = condition.field;

    if ('eq' in condition) {
      return `${field} == ${formatValueForESQLLiteral(condition.eq)}`;
    }
    if ('neq' in condition) {
      return `${field} != ${formatValueForESQLLiteral(condition.neq)}`;
    }
    if ('gt' in condition) {
      return `${field} > ${formatValueForESQLLiteral(condition.gt)}`;
    }
    if ('gte' in condition) {
      return `${field} >= ${formatValueForESQLLiteral(condition.gte)}`;
    }
    if ('lt' in condition) {
      return `${field} < ${formatValueForESQLLiteral(condition.lt)}`;
    }
    if ('lte' in condition) {
      return `${field} <= ${formatValueForESQLLiteral(condition.lte)}`;
    }
    if ('exists' in condition) {
      if (condition.exists === true) {
        return `${field} IS NOT NULL`;
      } else {
        return `${field} IS NULL`;
      }
    }
    if ('range' in condition) {
      if (condition.range) {
        const parts: string[] = [];
        if (condition.range.gt !== undefined)
          parts.push(`${field} > ${formatValueForESQLLiteral(condition.range.gt)}`);
        if (condition.range.gte !== undefined)
          parts.push(`${field} >= ${formatValueForESQLLiteral(condition.range.gte)}`);
        if (condition.range.lt !== undefined)
          parts.push(`${field} < ${formatValueForESQLLiteral(condition.range.lt)}`);
        if (condition.range.lte !== undefined)
          parts.push(`${field} <= ${formatValueForESQLLiteral(condition.range.lte)}`);
        return `(${parts.join(' AND ')})`;
      }
    }
    if ('contains' in condition) {
      return `${field} LIKE %${formatValueForESQLLiteral(condition.contains)}%`;
    }
    if ('startsWith' in condition) {
      return `${field} LIKE ${formatValueForESQLLiteral(condition.startsWith)}%`;
    }
    if ('endsWith' in condition) {
      return `${field} LIKE %${formatValueForESQLLiteral(condition.endsWith)}`;
    }
  } else if (isAndCondition(condition)) {
    const andConditions = condition.and.map((c) => conditionToESQL(c));
    return `(${andConditions.join(' AND ')})`;
  } else if (isOrCondition(condition)) {
    const orConditions = condition.or.map((c) => conditionToESQL(c));
    return `(${orConditions.join(' OR ')})`;
  } else if (isNotCondition(condition)) {
    const notCondition = conditionToESQL(condition.not);
    return `NOT(${notCondition})`;
  } else if (isAlwaysCondition(condition)) {
    return 'true';
  }

  return 'false';
}

function convertProcessorToESQL(processor: StreamlangProcessorDefinition): string | null {
  let esqlCommand: string | null = null;
  let conditionExpression: string | null = null;

  if (processor.where) {
    conditionExpression = conditionToESQL(processor.where);
  }

  switch (processor.action) {
    case 'rename':
      const renameProcessor = processor as RenameProcessor;
      // Assuming `renameProcessor.from` and `renameProcessor.to` are available columns in ES|QL
      // TODO: Check if `renameProcessor.ignore_missing` can be implemented
      // TODO: Check if `renameProcessor.override` can be implemented
      esqlCommand = `RENAME ${renameProcessor.from} AS ${renameProcessor.to}`;
      break;

    case 'set':
      // TODO: Check if `setProcessor.copy_from` can be implemented
      // TODO: Check if `setProcessor.override` can be implemented
      const setProcessor = processor as SetProcessor;
      const setValue = formatValueForESQLLiteral(setProcessor.value);
      esqlCommand = `EVAL ${setProcessor.to} = ${setValue}`;
      break;

    case 'grok':
      // TODO: Warn when there are multiple GROK patterns, as ES|QL only supports one pattern per GROK command
      const grokProcessor = processor as GrokProcessor;
      // Use ES|QL's triple quotes for GROK arguments to handle patterns with spaces or special characters
      const grokPatterns = grokProcessor.patterns.map((p) => `"""${p}"""`).join(', ');
      esqlCommand = `GROK ${grokProcessor.from} ${grokPatterns}`;
      break;

    case 'dissect':
      // TODO: Check if `dissectProcessor.append_separator` can be implemented
      // TODO: Check if `dissectProcessor.ignore_missing` can be implemented
      const dissectProcessor = processor as DissectProcessor;
      // Use ES|QL's triple quotes for DISSECT arguments to handle patterns with spaces or special characters
      esqlCommand = `DISSECT ${dissectProcessor.from} """${dissectProcessor.pattern}"""`;
      break;

    case 'date':
      const dateProcessor = processor as DateProcessor;
      const dateParseExpressions = dateProcessor.formats.map(
        (f) => `DATE_PARSE(${JSON.stringify(f)}, ${dateProcessor.from})`
      );
      // Use COALESCE to handle multiple date formats
      const coalesceArgs = dateParseExpressions.join(',\n    '); // Join with comma and indented newline
      const coalesceDateParse = `COALESCE(\n    ${coalesceArgs}\n  )`;
      const targetDateField = dateProcessor.to || dateProcessor.from;
      esqlCommand = `EVAL ${targetDateField} = DATE_FORMAT(${JSON.stringify(
        dateProcessor.output_format || 'yyyy-MM-dd'
      )}, ${coalesceDateParse})`;
      break;

    case 'append':
      const appendProcessor = processor as AppendProcessor;
      // Assuming `appendProcessor.to` will always be an available column in ES|QL
      // TODO: Check the behavior when there are multiple values in `appendProcessor.value`
      // TODO: See if `appenProcessor.allow_duplicates` being true or false could be implemented
      esqlCommand = `EVAL ${appendProcessor.to} = MV_APPEND(${
        appendProcessor.to
      }, ${formatValueForESQLLiteral(appendProcessor.value)})`;
      break;

    case 'manual_ingest_pipeline':
      esqlCommand = `// Manual ingest pipeline processors not supported in ES|QL`;
      break;

    default:
      return null;
  }

  // If there's a condition and the command is an EVAL, wrap it in a CASE statement
  if (conditionExpression && esqlCommand && esqlCommand.startsWith('EVAL ')) {
    // Extract the field and value part from EVAL statement: EVAL field = value
    const evalRegex = /^EVAL\s+([^=]+)=\s*(.*)$/s;
    const match = esqlCommand.match(evalRegex);

    if (match && match[1] && match[2]) {
      const field = match[1].trim();
      const valueExpression = match[2].trim();
      // Format CASE arguments on the same line
      return `EVAL ${field} = CASE(
    ${conditionExpression}, ${valueExpression}
  )`;
    }
  }

  return esqlCommand;
}

export function convertStreamlangDSLToESQLCommands(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions?: ESQLTranspilationOptions
): string {
  const commands: string[] = [];

  actionSteps.forEach((actionStep) => {
    // TODO: Check/Test a variety of nested where and where not
    const processorCommand = convertProcessorToESQL(actionStep);
    if (processorCommand) {
      commands.push(processorCommand);
    }
  });

  return commands.join('\n| ');
}
