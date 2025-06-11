/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { DetectedEntity } from '../../../common/types';
import { getEntityHash } from './get_entity_hash';

function getMatches(
  content: string,
  regex: RegExp,
  className: string,
  normalize: boolean = false
): DetectedEntity[] {
  const result: DetectedEntity[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const entityText = match[0];
    const start = match.index;
    const end = start + entityText.length;
    const hash = getEntityHash(entityText, className, normalize);
    result.push({
      entity: entityText,
      class_name: className,
      start_pos: start,
      end_pos: end,
      hash,
      type: 'regex',
    });
  }
  return result;
}

export interface AnonymizationRule {
  id: string;
  entityClass: string;
  type: 'regex' | 'ner';
  pattern?: string;
  enabled: boolean;
  builtIn: boolean;
  description?: string;
  normalize?: boolean;
}

export function detectRegexEntities(
  content: string,
  rules: AnonymizationRule[] = [],
  logger: Logger
): DetectedEntity[] {
  const results: DetectedEntity[] = [];

  // Filter for enabled regex rules
  const regexRules = rules.filter((rule) => rule.type === 'regex' && rule.enabled && rule.pattern);

  // Apply each regex rule
  for (const rule of regexRules) {
    try {
      const regex = new RegExp(rule.pattern!, 'g');
      results.push(...getMatches(content, regex, rule.entityClass, rule.normalize ?? false));
    } catch (error) {
      // Skip invalid regex patterns
      logger.error(`Invalid regex pattern in rule ${rule.id}: ${rule.pattern}`, error);
    }
  }

  return results;
}
