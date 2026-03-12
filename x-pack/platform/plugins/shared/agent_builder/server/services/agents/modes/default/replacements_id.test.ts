/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractReplacementsId } from './replacements_id';

describe('extractReplacementsId', () => {
  const validUuid = '123e4567-e89b-42d3-a456-426614174000';

  it('returns undefined for non-object input', () => {
    expect(extractReplacementsId(undefined)).toBeUndefined();
    expect(extractReplacementsId('foo')).toBeUndefined();
  });

  it('returns undefined when anonymization metadata is missing', () => {
    expect(extractReplacementsId({})).toBeUndefined();
    expect(extractReplacementsId({ anonymization: {} })).toBeUndefined();
  });

  it('returns exact uuid replacementsId as-is', () => {
    expect(
      extractReplacementsId({
        anonymization: {
          replacementsId: validUuid,
        },
      })
    ).toBe(validUuid);
  });

  it('extracts first uuid when replacementsId contains concatenated uuids', () => {
    expect(
      extractReplacementsId({
        anonymization: {
          replacementsId: `${validUuid}${validUuid}`,
        },
      })
    ).toBe(validUuid);
  });

  it('returns undefined when replacementsId does not contain a uuid', () => {
    expect(
      extractReplacementsId({
        anonymization: {
          replacementsId: 'not-a-uuid',
        },
      })
    ).toBeUndefined();
  });
});
