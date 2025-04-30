/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import objectHash from 'object-hash';
import { DetectedEntity } from '../types';

export function getHashedEntity(
  entity: string,
  className: string,
  normalize: boolean = false
): string {
  const textForHash = normalize ? entity.toLowerCase() : entity;
  return objectHash({ entity: textForHash, class_name: className });
}

const urlRegex = /https?:\/\/[^\s]+/gi;
const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

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
    const hash = getHashedEntity(entityText, className, normalize);
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

export function getRegexEntities(content: string): DetectedEntity[] {
  return [
    ...getMatches(content, urlRegex, 'URL', true),
    ...getMatches(content, ipRegex, 'IP'),
    ...getMatches(content, emailRegex, 'EMAIL', true),
  ];
}
