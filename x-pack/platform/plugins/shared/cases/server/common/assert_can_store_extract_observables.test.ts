/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { assertCanStoreExtractObservables } from './assert_can_store_extract_observables';

describe('assertCanStoreExtractObservables', () => {
  it.each([[GENERAL_CASES_OWNER], [OBSERVABILITY_OWNER]])(
    'throws a 400 when true is stored for the %s owner',
    (owner) => {
      expect.assertions(3);

      try {
        assertCanStoreExtractObservables({ owner, extractObservables: true });
      } catch (error) {
        expect(error.isBoom).toBe(true);
        expect(error.output.statusCode).toBe(400);
        expect(error.message).toBe(
          `Setting extractObservables to true is not allowed for the "${owner}" owner. Only owners that support automatic observable extraction can enable it.`
        );
      }
    }
  );

  it.each([[SECURITY_SOLUTION_OWNER], [GENERAL_CASES_OWNER], [OBSERVABILITY_OWNER]])(
    'does not throw when false is stored for the %s owner',
    (owner) => {
      expect(() =>
        assertCanStoreExtractObservables({ owner, extractObservables: false })
      ).not.toThrow();
    }
  );

  it('does not throw when the value is undefined', () => {
    expect(() =>
      assertCanStoreExtractObservables({
        owner: GENERAL_CASES_OWNER,
        extractObservables: undefined,
      })
    ).not.toThrow();
  });

  it('does not throw when true is stored for the Security owner', () => {
    expect(() =>
      assertCanStoreExtractObservables({
        owner: SECURITY_SOLUTION_OWNER,
        extractObservables: true,
      })
    ).not.toThrow();
  });

  it.each([[''], ['foobar'], ['securitySolutionFixture']])(
    'does not throw when true is stored for the unknown owner %j',
    (owner) => {
      expect(() =>
        assertCanStoreExtractObservables({ owner, extractObservables: true })
      ).not.toThrow();
    }
  );
});
