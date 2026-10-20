/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parses the JSON object from a template completion, including one wrapped in a
 * markdown fence. Throws when the text has no object.
 */
export const parseTemplateJson = (content: string): unknown => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? content).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Template response did not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
};
