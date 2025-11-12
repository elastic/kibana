/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertProcessor } from '../../../../types/processors';
import type { ConvertType } from '../../../../types/formats/convert_types';
import { convertConditionToOTTL } from '../condition_to_ottl';
import { fieldToOTTLGetter, fieldToOTTLSetter } from '../field_mapping';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class ConvertProcessorConverter extends OTTLProcessorConverter<ConvertProcessor> {
  convert(
    processor: ConvertProcessor,
    context: ProcessorConverterContext
  ): ProcessorConversionResult {
    const fromField = fieldToOTTLGetter(processor.from);
    const toField = processor.to
      ? fieldToOTTLSetter(processor.to)
      : fieldToOTTLSetter(processor.from);

    const conversionFunc = this.getConversionFunction(processor.type);
    const statement = `set(${toField}, ${conversionFunc}(${fromField}))`;

    // Build conditions
    const conditions: string[] = [];
    if (processor.ignore_missing) {
      conditions.push(`${fromField} != nil`);
    }
    // Note: ConvertProcessor has conditional where based on union type
    // We check if it exists on the processor instance
    if ('where' in processor && processor.where) {
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

  private getConversionFunction(type: ConvertType): string {
    const mapping: Record<ConvertType, string> = {
      integer: 'Int',
      long: 'Int',
      double: 'Double',
      string: 'String',
      boolean: 'Bool',
    };
    return mapping[type] || 'String';
  }
}
