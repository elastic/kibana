/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document, LineCounter } from 'yaml';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { validateLiquidYamlScalars } from '@kbn/workflows-yaml';

export function validateLiquidTemplate(
  yamlString: string,
  yamlDocument: Document,
  lineCounter: LineCounter
): YamlValidationResult[] {
  return validateLiquidYamlScalars(yamlString, yamlDocument, lineCounter).filter(
    (result) => result.owner === 'liquid-template-validation'
  );
}
