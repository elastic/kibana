/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABLE_TYPES_BUILTIN_KEYS } from '../constants/observables';
import {
  DEFAULT_OBSERVABLE_TYPES,
  IPV4_VALUE_PATTERN,
  IPV6_VALUE_PATTERN,
  getHashFields,
} from './default_observable_types';
import { getIPType } from './get_observables_from_ecs';

describe('DEFAULT_OBSERVABLE_TYPES', () => {
  it('has one entry for every built-in type, keyed by its key', () => {
    expect(Object.keys(DEFAULT_OBSERVABLE_TYPES).sort()).toEqual(
      [...OBSERVABLE_TYPES_BUILTIN_KEYS].sort()
    );
    Object.entries(DEFAULT_OBSERVABLE_TYPES).forEach(([key, observableType]) => {
      expect(observableType.key).toBe(key);
    });
  });

  it('enables every default path', () => {
    Object.values(DEFAULT_OBSERVABLE_TYPES).forEach(({ paths }) => {
      paths.forEach(({ enabled }) => expect(enabled).toBe(true));
    });
  });

  it('lists the 24 file hash paths', () => {
    const { paths } = DEFAULT_OBSERVABLE_TYPES['observable-type-file-hash'];
    expect(paths).toHaveLength(24);
    expect(paths.map(({ path }) => path)).toEqual(getHashFields());
  });

  it.each(['192.168.1.1', '2001:0db8:85a3:0000:0000:8a2e:0370:7334', '::1', '', 'not-an-ip'])(
    'IP value patterns agree with getIPType for "%s"',
    (value) => {
      const matchesIPv4 = new RegExp(IPV4_VALUE_PATTERN).test(value);
      const matchesIPv6 = new RegExp(IPV6_VALUE_PATTERN).test(value);

      expect(matchesIPv4).not.toBe(matchesIPv6);
      expect(matchesIPv6 ? 'IPV6' : 'IPV4').toBe(getIPType(value));
    }
  );
});
