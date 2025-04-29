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
    it('returns the initial configuration if there are no configurations', () => {
      expect(getConfigurationByOwner({ configurations: [], owner: 'foobar' })).toBe(
        initialConfiguration
      );
    });

    it('returns the initial configuration if the owner is not found', () => {
      expect(
        getConfigurationByOwner({
          configurations: [{ owner: 'foo' }, { owner: 'bar' }] as CasesConfigurationUI[],
          owner: 'foobar',
        })
      ).toBe(initialConfiguration);
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
