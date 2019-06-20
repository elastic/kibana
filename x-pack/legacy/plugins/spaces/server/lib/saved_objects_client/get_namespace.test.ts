/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getNamespace } from './get_namespace';
import { DEFAULT_SPACE_NAMESPACE } from './default_space_namespace';

describe('getNamespace', () => {
  [1, true, () => null, {}, Symbol()].forEach(entry => {
    it(`throws an error when an invalid namespace (${String(entry)}) is provided`, () => {
      expect(() =>
        // @ts-ignore TS knows these values aren't allowed
        getNamespace({ namespace: entry }, DEFAULT_SPACE_ID)
      ).toThrowErrorMatchingSnapshot();
    });
  });
  describe(`without specifying 'options.namespace'`, () => {
    it(`returns undefined for the default space`, () => {
      expect(getNamespace({}, DEFAULT_SPACE_ID)).toBeUndefined();
    });

    it(`returns the space id for non-default spaces`, () => {
      expect(getNamespace({}, 'some-space')).toEqual('some-space');
    });
  });

  describe(`when specifying 'options.namespace' with empty string`, () => {
    it(`returns undefined for the default space`, () => {
      expect(getNamespace({ namespace: '' }, DEFAULT_SPACE_ID)).toBeUndefined();
    });

    it(`returns the space id for non-default spaces`, () => {
      expect(getNamespace({ namespace: '' }, 'some-space')).toEqual('some-space');
    });
  });

  describe(`when specifying 'options.namespace' with the DEFAULT_SPACE_NAMESPACE symbol`, () => {
    it(`returns undefined for the default space`, () => {
      expect(
        getNamespace({ namespace: DEFAULT_SPACE_NAMESPACE }, DEFAULT_SPACE_ID)
      ).toBeUndefined();
    });

    it(`returns undefined for non-default spaces`, () => {
      expect(getNamespace({ namespace: DEFAULT_SPACE_NAMESPACE }, 'some-space')).toBeUndefined();
    });
  });

  describe(`when specifying 'options.namespace'`, () => {
    it(`returns 'undefined' when specified via options.namespace`, () => {
      expect(getNamespace({ namespace: 'override-space' }, DEFAULT_SPACE_ID)).toEqual(
        'override-space'
      );
    });

    it(`returns the namespace from options`, () => {
      expect(getNamespace({ namespace: 'override-space' }, 'some-space')).toEqual('override-space');
    });
  });
});
