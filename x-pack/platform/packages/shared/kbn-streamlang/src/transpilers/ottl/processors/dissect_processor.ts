/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectProcessor } from '../../../../types/processors';
import { convertConditionToOTTL } from '../condition_to_ottl';
import { fieldToOTTLGetter } from '../field_mapping';
import { convertDissectToRegex } from '../ottl_helpers';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class DissectProcessorConverter extends OTTLProcessorConverter<DissectProcessor> {
  convert(
    processor: DissectProcessor,
    context: ProcessorConverterContext
  ): ProcessorConversionResult {
    const fromField = fieldToOTTLGetter(processor.from);

    // OTTL doesn't have native dissect, convert to regex pattern
    const regexPattern = convertDissectToRegex(processor.pattern);

    const statements = [
      `set(cache["dissect"], ExtractPatterns(${fromField}, "${regexPattern}"))`,
      `merge_maps(attributes, cache["dissect"], "upsert")`,
    ];

    // Handle ignore_missing and where condition
    const conditions: string[] = [];
    if (processor.ignore_missing) {
      conditions.push(`${fromField} != nil`);
    }
    if (processor.where) {
      conditions.push(convertConditionToOTTL(processor.where));
    }

    return {
      statements: [
        {
          context: 'log',
          ...(conditions.length > 0 ? { conditions } : {}),
          statements,
        },
      ],
    };
  }
}
