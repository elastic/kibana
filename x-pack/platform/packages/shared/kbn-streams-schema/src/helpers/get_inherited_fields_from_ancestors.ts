/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedFieldDefinition } from '../fields';
import { Streams } from '../models/streams';

export const getInheritedFieldsFromAncestors = (ancestors: Streams.WiredStream.Definition[]) => {
  return ancestors.reduce<InheritedFieldDefinition>((acc, def) => {
    Object.entries(def.ingest.wired.fields).forEach(([key, fieldDef]) => {
      acc[key] = { ...fieldDef, from: def.name };
    });
    return acc;
  }, {});
};
