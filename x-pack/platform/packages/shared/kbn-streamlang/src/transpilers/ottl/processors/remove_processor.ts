/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoveProcessor } from '../../../../types/processors';
import { convertConditionToOTTL } from '../condition_to_ottl';
import { fieldToOTTLGetter, getFieldParentAndName } from '../field_mapping';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class RemoveProcessorConverter extends OTTLProcessorConverter<RemoveProcessor> {
  convert(
    processor: RemoveProcessor,
    context: ProcessorConverterContext
  ): ProcessorConversionResult {
    const { parent, field } = getFieldParentAndName(processor.from);
    const statement = `delete_key(${parent}, "${field}")`;

    // Build conditions
    const conditions: string[] = [];
    if (processor.ignore_missing) {
      const fromField = fieldToOTTLGetter(processor.from);
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
          statements: [statement],
        },
      ],
    };
  }
}
