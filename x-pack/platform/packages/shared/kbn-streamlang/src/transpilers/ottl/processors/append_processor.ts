/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppendProcessor } from '../../../../types/processors';
import { fieldToOTTLGetter, fieldToOTTLSetter } from '../field_mapping';
import { valueToOTTLLiteral } from '../ottl_helpers';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class AppendProcessorConverter extends OTTLProcessorConverter<AppendProcessor> {
  convert(
    processor: AppendProcessor,
    context: ProcessorConverterContext
  ): ProcessorConversionResult {
    const toField = fieldToOTTLGetter(processor.to);
    const toFieldSetter = fieldToOTTLSetter(processor.to);

    const statements: string[] = [];

    // Ensure field exists as array
    statements.push(`set(cache["temp_array"], IsArray(${toField}) ? ${toField} : [])`);

    // Append each value
    processor.value.forEach((val) => {
      const valLiteral = valueToOTTLLiteral(val);
      if (processor.allow_duplicates) {
        statements.push(`set(cache["temp_array"], Append(cache["temp_array"], ${valLiteral}))`);
      } else {
        // Only append if value doesn't exist
        statements.push(
          `set(cache["temp_array"], Contains(cache["temp_array"], ${valLiteral}) ? cache["temp_array"] : Append(cache["temp_array"], ${valLiteral}))`
        );
      }
    });

    // Set the result back
    statements.push(`set(${toFieldSetter}, cache["temp_array"])`);

    return {
      statements: [this.wrapWithCondition(statements, processor.where)],
    };
  }
}
