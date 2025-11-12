/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoveByPrefixProcessor } from '../../../../types/processors';
import {
  OTTLProcessorConverter,
  type ProcessorConverterContext,
  type ProcessorConversionResult,
} from './processor_base';

export class RemoveByPrefixProcessorConverter extends OTTLProcessorConverter<RemoveByPrefixProcessor> {
  convert(
    processor: RemoveByPrefixProcessor,
    context: ProcessorConverterContext
  ): ProcessorConversionResult {
    // OTTL doesn't support iteration over keys easily
    // This would need a custom OTTL function or is not supported
    throw new Error(
      `remove_by_prefix processor is not supported in OTTL transpilation. ` +
        `The processor attempts to remove fields by prefix, which requires runtime ` +
        `iteration over field names. Consider using explicit remove processors instead.`
    );
  }
}
