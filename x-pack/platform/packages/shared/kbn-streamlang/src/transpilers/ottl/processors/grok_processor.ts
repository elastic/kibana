/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '../../../../types/processors';
import { parseMultiGrokPatterns } from '../../../../types/utils/grok_patterns';
import { convertConditionToOTTL } from '../condition_to_ottl';
import { fieldToOTTLGetter, fieldToOTTLSetter } from '../field_mapping';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class GrokProcessorConverter extends OTTLProcessorConverter<GrokProcessor> {
  convert(processor: GrokProcessor, context: ProcessorConverterContext): ProcessorConversionResult {
    const fromField = fieldToOTTLGetter(processor.from);

    // Parse all patterns to extract field information
    const parseResult = parseMultiGrokPatterns(processor.patterns);
    const allFields = parseResult.allFields;

    // Unified approach: cascade with short-circuit logic for all cases
    // Try each pattern in order, skip subsequent ones if one succeeds
    const statementBlocks: Array<{ statements: string[]; conditions?: string[] }> = [];

    processor.patterns.forEach((pattern, idx) => {
      const statements: string[] = [
        `set(cache["grok_${idx}"], ExtractGrokPatterns(${fromField}, "${pattern}", ${!processor.ignore_missing}))`,
      ];

      // Set matched flag if this pattern extracted any fields
      statements.push(`set(cache["matched"], Len(cache["grok_${idx}"]) > 0)`);

      if (idx === 0) {
        // First pattern: no condition, always try
        statementBlocks.push({ statements });
      } else {
        // Subsequent patterns: only try if previous patterns failed
        statementBlocks.push({
          statements,
          conditions: ['cache["matched"] == false'],
        });
      }
    });

    // Final block: route fields from whichever pattern succeeded (only if matched)
    const finalStatements: string[] = [];

    // Coalesce to get first successful extraction
    if (processor.patterns.length === 1) {
      finalStatements.push(`set(cache["grok_result"], cache["grok_0"])`);
    } else {
      const cacheRefs = processor.patterns.map((_, idx) => `cache["grok_${idx}"]`).join(', ');
      finalStatements.push(`set(cache["grok_result"], Coalesce(${cacheRefs}, {}))`);
    }

    // Route each extracted field to its proper destination
    for (const field of allFields) {
      const setter = fieldToOTTLSetter(field.name);
      finalStatements.push(`set(${setter}, cache["grok_result"]["${field.name}"])`);
    }

    // Only execute field routing if a pattern matched
    statementBlocks.push({
      statements: finalStatements,
      conditions: ['cache["matched"] == true'],
    });

    // Create multiple statement blocks with conditions
    const ottlStatements = this.createStatements(statementBlocks);

    // Wrap all blocks with the processor's where condition if present
    if (processor.where) {
      // If there's a where condition, we need to wrap all blocks
      return {
        statements: ottlStatements.map((stmt) => ({
          ...stmt,
          conditions: processor.where
            ? [...(stmt.conditions || []), convertConditionToOTTL(processor.where)]
            : stmt.conditions,
        })),
      };
    }

    return {
      statements: ottlStatements,
    };
  }
}
