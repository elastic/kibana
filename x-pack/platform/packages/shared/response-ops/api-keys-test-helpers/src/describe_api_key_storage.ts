/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import type { ApiKeys, ApiKeyStorage } from '@kbn/response-ops-api-keys';
import { getInvalidationTargets, toFakeRequest } from '@kbn/response-ops-api-keys';
import type { ApiKeyFixtureName } from './fixtures';
import { apiKeyFixtures } from './fixtures';

export interface DescribeApiKeyStorageOptions {
  /** Fixtures the plugin can't store, with the reason. */
  unsupported?: Partial<Record<ApiKeyFixtureName, string>>;
}

/** Checks that a plugin's {@link ApiKeyStorage} keeps every key shape intact. */
export const describeApiKeyStorage = <Attributes>(
  name: string,
  storage: ApiKeyStorage<Attributes>,
  { unsupported = {} }: DescribeApiKeyStorageOptions = {}
): void => {
  const fixtures = (Object.entries(apiKeyFixtures) as Array<[ApiKeyFixtureName, ApiKeys]>).filter(
    ([fixtureName]) => unsupported[fixtureName] === undefined
  );

  describe(`${name} API key storage`, () => {
    describe.each(fixtures)('%s', (_, keys) => {
      const stored = () => storage.read(storage.write(keys));

      test('reads back what it wrote', () => {
        expect(stored()).toEqual(keys);
      });

      test('invalidates only the keys Kibana owns', () => {
        const targets = getInvalidationTargets(stored());

        if (keys.createdByUser) {
          expect(targets).toEqual([]);
          return;
        }
        expect(targets.map(({ apiKeyId }) => apiKeyId)).toEqual(
          [keys.es?.id, keys.uiam?.id].filter(Boolean)
        );
      });

      test('runs background work with the stored credential', () => {
        const { request } = toFakeRequest(stored(), { prefer: 'uiam' });
        const credential = keys.uiam?.secret ?? keys.es?.encoded;

        expect(request.headers.authorization).toEqual(`ApiKey ${credential}`);
        expect(isExternalUiamCredential(request)).toBe(keys.uiam?.external === true);
      });
    });
  });
};
