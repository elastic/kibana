/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesConfigurationUI } from '../types';
import { getConfigurationByOwner, initialConfiguration } from './utils';

describe('Utils', () => {
  describe('getConfigurationByOwner', () => {
    it('returns a fallback with the owner default when configurations is empty', () => {
      expect(getConfigurationByOwner({ configurations: [], owner: 'foobar' })).toEqual({
        ...initialConfiguration,
        owner: 'foobar',
        extractObservables: false,
      });
    });

    it('returns a fallback configuration with the owner and its autoExtractDefault when the owner is not found', () => {
      expect(
        getConfigurationByOwner({
          configurations: [{ owner: 'foo' }, { owner: 'bar' }] as CasesConfigurationUI[],
          owner: 'foobar',
        })
      ).toEqual({ ...initialConfiguration, owner: 'foobar', extractObservables: false });
    });

    it('returns the expected configuration when searching by owner', () => {
      expect(
        getConfigurationByOwner({
          configurations: [{ owner: 'foobar' }, { owner: 'bar' }] as CasesConfigurationUI[],
          owner: 'foobar',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "owner": "foobar",
        }
      `);
    });

    it('returns the initial configuration if the owner is undefined', () => {
      expect(
        getConfigurationByOwner({
          configurations: [{ owner: 'foobar' }, { owner: 'bar' }] as CasesConfigurationUI[],
          owner: undefined,
        })
      ).toBe(initialConfiguration);
    });
  });
});
