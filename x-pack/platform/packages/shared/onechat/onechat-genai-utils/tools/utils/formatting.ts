/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingField } from './mappings';
import { generateXmlTag } from './xml';

/**
 * Format the provided mapping field as xml, to be used in LLM prompts.
 */
export const formatFieldAsXml = (field: MappingField): string => {
  return generateXmlTag('field', {
    path: field.path,
    type: field.type,
    description: field.meta.description,
  });
};
