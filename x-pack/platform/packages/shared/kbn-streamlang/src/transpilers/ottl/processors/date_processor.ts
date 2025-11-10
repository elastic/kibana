/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateProcessor } from '../../../../types/processors';
import { fieldToOTTLGetter, fieldToOTTLSetter } from '../field_mapping';
import { convertJavaDateFormatToGo } from '../ottl_helpers';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class DateProcessorConverter extends OTTLProcessorConverter<DateProcessor> {
  convert(processor: DateProcessor, context: ProcessorConverterContext): ProcessorConversionResult {
    const fromField = fieldToOTTLGetter(processor.from);
    const toField = processor.to ? fieldToOTTLSetter(processor.to) : fromField;

    const statements: string[] = [];

    // Try each format until one succeeds
    processor.formats.forEach((format, idx) => {
      const goFormat = convertJavaDateFormatToGo(format);
      statements.push(
        `set(cache["parsed_time_${idx}"], Time(ParseTime(${fromField}, "${goFormat}")))`
      );
    });

    // Use first successful parse (Coalesce returns first non-nil)
    const cacheRefs = processor.formats.map((_, idx) => `cache["parsed_time_${idx}"]`).join(', ');
    statements.push(`set(${toField}, Coalesce(${cacheRefs}))`);

    // Apply output format if specified
    if (processor.output_format) {
      const goOutputFormat = convertJavaDateFormatToGo(processor.output_format);
      statements.push(`set(${toField}, FormatTime(${toField}, "${goOutputFormat}"))`);
    }

    return {
      statements: [this.wrapWithCondition(statements, processor.where)],
    };
  }
}
