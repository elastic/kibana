/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const DocumentRt = rt.strict({
  id: rt.string,
  index: rt.string,
  attached_at: rt.string,
});

export const DocumentResponseRt = rt.array(DocumentRt);
export type DocumentResponse = rt.TypeOf<typeof DocumentResponseRt>;
