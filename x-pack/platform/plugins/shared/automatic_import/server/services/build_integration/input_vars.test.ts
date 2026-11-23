/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInputVars } from './input_vars';

describe('getInputVars', () => {
  describe('tcp', () => {
    it('includes an ssl var of type yaml', () => {
      const vars = getInputVars('tcp');
      const sslVar = vars.find((v) => v.name === 'ssl');
      expect(sslVar).toBeDefined();
      expect(sslVar?.type).toBe('yaml');
    });

    it('ssl var is not required and not shown to user by default', () => {
      const vars = getInputVars('tcp');
      const sslVar = vars.find((v) => v.name === 'ssl');
      expect(sslVar?.required).toBe(false);
      expect(sslVar?.show_user).toBe(false);
    });

    it('ssl var has no default so it is empty when unconfigured', () => {
      const vars = getInputVars('tcp');
      const sslVar = vars.find((v) => v.name === 'ssl');
      expect(sslVar?.default).toBeUndefined();
    });
  });

  describe('udp', () => {
    it('does not include an ssl var', () => {
      const vars = getInputVars('udp');
      const sslVar = vars.find((v) => v.name === 'ssl');
      expect(sslVar).toBeUndefined();
    });
  });
});
