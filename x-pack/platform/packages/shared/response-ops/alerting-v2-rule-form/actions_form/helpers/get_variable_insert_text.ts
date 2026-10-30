/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, visit } from 'yaml';

// True when the text between `start` and `end` parses as part of a YAML string scalar.
const isWithinStringScalar = (source: string, start: number, end: number): boolean => {
  let isWithin = false;
  visit(parseDocument(source), {
    Scalar(_, { value, range }) {
      if (typeof value === 'string' && range && range[0] <= start && end <= range[1]) {
        isWithin = true;
        return visit.BREAK;
      }
    },
  });
  return isWithin;
};

/**
 * Returns the `{{ name }}` template to insert between `before` and `after` in a params YAML,
 * quoted only where a bare template would parse as a YAML flow mapping instead of a string.
 */
export const getVariableInsertText = (name: string, before: string, after: string): string => {
  const template = `{{ ${name} }}`;
  const fits = (text: string): boolean =>
    isWithinStringScalar(`${before}${text}${after}`, before.length, before.length + text.length);

  if (fits(template)) {
    return template;
  }
  const quotedTemplate = `"${template}"`;
  return fits(quotedTemplate) ? quotedTemplate : template;
};
