/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duplicateName } from './duplicate_name';

describe('duplicateName', () => {
  describe('when name has no numeric suffix', () => {
    it('should append "_1" to a simple name', () => {
      expect(duplicateName('tool')).toBe('tool_1');
    });
  });

  describe('when name has existing numeric suffix', () => {
    it('should increment single digit numbers', () => {
      expect(duplicateName('tool_1')).toBe('tool_2');
      expect(duplicateName('tool_10')).toBe('tool_11');
      expect(duplicateName('tool_9')).toBe('tool_10');
      expect(duplicateName('tool_0')).toBe('tool_1');
    });
  });
});
