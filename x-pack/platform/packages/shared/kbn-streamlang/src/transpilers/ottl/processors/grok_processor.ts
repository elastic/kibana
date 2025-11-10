/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '../../../../types/processors';
import { fieldToOTTLGetter } from '../field_mapping';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class GrokProcessorConverter extends OTTLProcessorConverter<GrokProcessor> {
  convert(processor: GrokProcessor, context: ProcessorConverterContext): ProcessorConversionResult {
    const fromField = fieldToOTTLGetter(processor.from);

    // OTTL ExtractGrokPatterns tries patterns in order and returns first match
    // We need to try each pattern and merge results
    const statements: string[] = [];

    processor.patterns.forEach((pattern, idx) => {
      statements.push(
        `set(cache["grok_${idx}"], ExtractGrokPatterns(${fromField}, "${pattern}", ${!processor.ignore_missing}))`
      );
    });

    // Merge all successful extractions (coalesce to first non-nil)
    if (processor.patterns.length === 1) {
      statements.push(`merge_maps(attributes, cache["grok_0"], "upsert")`);
    } else {
      // Try patterns in order, use first that succeeds
      const cacheRefs = processor.patterns.map((_, idx) => `cache["grok_${idx}"]`).join(', ');
      statements.push(`set(cache["grok_result"], Coalesce(${cacheRefs}, {}))`);
      statements.push(`merge_maps(attributes, cache["grok_result"], "upsert")`);
    }

    return {
      statements: [this.wrapWithCondition(statements, processor.where)],
    };
  }
}
