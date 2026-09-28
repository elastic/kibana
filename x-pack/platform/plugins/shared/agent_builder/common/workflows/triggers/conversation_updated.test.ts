/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSHA256Hash } from '@kbn/crypto';
import { stableStringify } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import { conversationUpdatedEventSchema } from './conversation_updated';

describe('conversationUpdatedEventSchema', () => {
  it('hashes the JSON schema the way the trigger approval route does', () => {
    const jsonSchema = z.toJSONSchema(conversationUpdatedEventSchema) as Record<string, unknown>;
    const schemaHash = createSHA256Hash(stableStringify(jsonSchema));
    expect(schemaHash).toBe('0b002574d02033ef98a6407aa6f4f0c818425fb4abc57de66cc770daf604cf80');
  });
});
