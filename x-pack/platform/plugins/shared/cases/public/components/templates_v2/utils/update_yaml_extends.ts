/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, isMap, stringify } from 'yaml';

export const setYamlExtends = (yaml: string, templateId: string): string => {
  if (!yaml || yaml.trim() === '') {
    return stringify({ extends: templateId });
  }
  try {
    const doc = parseDocument(yaml);
    if (!isMap(doc.contents)) {
      return yaml;
    }
    doc.set('extends', templateId);
    return doc.toString();
  } catch {
    return yaml;
  }
};

export const removeYamlExtends = (yaml: string): string => {
  if (!yaml || yaml.trim() === '') {
    return yaml;
  }
  try {
    const doc = parseDocument(yaml);
    if (!isMap(doc.contents)) {
      return yaml;
    }
    doc.delete('extends');
    return doc.toString();
  } catch {
    return yaml;
  }
};
