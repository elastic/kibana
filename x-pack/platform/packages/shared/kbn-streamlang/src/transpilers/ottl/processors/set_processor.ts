/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetProcessor } from '../../../../types/processors';
import { fieldToOTTLGetter, fieldToOTTLSetter } from '../field_mapping';
import { valueToOTTLLiteral } from '../ottl_helpers';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class SetProcessorConverter extends OTTLProcessorConverter<SetProcessor> {
  convert(processor: SetProcessor, context: ProcessorConverterContext): ProcessorConversionResult {
    const toField = fieldToOTTLSetter(processor.to);

    let statement: string;
    if (processor.value !== undefined) {
      // Set constant value
      statement = `set(${toField}, ${valueToOTTLLiteral(processor.value)})`;
    } else if (processor.copy_from) {
      // Copy from another field
      const fromField = fieldToOTTLGetter(processor.copy_from);
      statement = `set(${toField}, ${fromField})`;
    } else {
      throw new Error('Set processor must have either value or copy_from');
    }

    return {
      statements: [this.wrapWithCondition([statement], processor.where)],
    };
  }
}
