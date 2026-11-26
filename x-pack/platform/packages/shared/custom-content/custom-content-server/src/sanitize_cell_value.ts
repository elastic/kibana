/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_SANITIZED_CELL_LENGTH = 500;
const HTML_ANGLE_BRACKETS = /[<>]/g;
const LINE_BREAKS = /[\r\n]+/g;
const LIQUID_OUTPUT_DELIMITER = /\{\{/g;
const LIQUID_TAG_DELIMITER = /\{%/g;

export function sanitizeCellValue(v: unknown): string {
  return String(v ?? '')
    .slice(0, MAX_SANITIZED_CELL_LENGTH)
    .replace(HTML_ANGLE_BRACKETS, '')
    .replace(LINE_BREAKS, ' ')
    .replace(LIQUID_OUTPUT_DELIMITER, '{ {')
    .replace(LIQUID_TAG_DELIMITER, '{ %');
}
