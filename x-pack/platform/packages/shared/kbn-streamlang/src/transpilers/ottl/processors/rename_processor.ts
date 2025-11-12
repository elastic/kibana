/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenameProcessor } from '../../../../types/processors';
import { convertConditionToOTTL } from '../condition_to_ottl';
import { fieldToOTTLGetter, getFieldParentAndName } from '../field_mapping';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class RenameProcessorConverter extends OTTLProcessorConverter<RenameProcessor> {
  convert(
    processor: RenameProcessor,
    context: ProcessorConverterContext
  ): ProcessorConversionResult {
    const fromField = fieldToOTTLGetter(processor.from);
    const toField = fieldToOTTLGetter(processor.to);
    const { parent, field } = getFieldParentAndName(processor.from);

    const statements = [
      // Copy to new location
      `set(${toField}, ${fromField})`,
      // Delete original
      `delete_key(${parent}, "${field}")`,
    ];

    // Build conditions
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
