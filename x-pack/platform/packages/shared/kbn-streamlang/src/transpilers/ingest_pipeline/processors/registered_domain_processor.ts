/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RegisteredDomainProcessor } from '../../../../types/processors';

/**
 * Converts a Streamlang RegisteredDomainProcessor into an Ingest Pipeline registered_domain processor.
 *
 * @example
 * Input:
 * {
 *   action: 'registered_domain',
 *   expression: 'fqdn',
 *   prefix: 'domain',
 * }
 *
 * Output:
 * {
 *   registered_domain: {
 *     field: 'fqdn',
 *     target_field: 'domain',
 *     ignore_missing: true,
 *   },
 * }
 */
export function processRegisteredDomainProcessor(
  processor: Omit<RegisteredDomainProcessor, 'where' | 'action'> & {
    if?: string;
    tag?: string;
  }
): IngestProcessorContainer {
  const { expression, prefix, ignore_failure, ignore_missing = true, description, tag } = processor;

  const registeredDomainProcessor: IngestProcessorContainer = {
    registered_domain: {
      field: expression,
      target_field: prefix,
      ignore_failure,
      ignore_missing,
      description,
      tag,
      if: processor.if,
    },
  };

  return registeredDomainProcessor;
}
