/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';
import { createIsNarrowSchema } from '../shared/type_guards';

export const isRootStreamDefinition = createIsNarrowSchema(
  Streams.all.Definition.right,
  Streams.WiredStream.Definition.right.refine((stream) => {
    return stream.name.split('.').length === 1;
  })
);
