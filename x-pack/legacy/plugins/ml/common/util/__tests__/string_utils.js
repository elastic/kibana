/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { renderTemplate } from '../string_utils';

describe('ML - string utils', () => {
  describe('renderTemplate', () => {
    it('returns plain string', () => {
      const templateString = 'plain string';
      const result = renderTemplate(templateString);
      expect(result).to.be(result);
    });
    it('returns rendered template with one replacement', () => {
      const templateString = 'string with {{one}} replacement';
      const result = renderTemplate(templateString, { one: '1' });
      expect(result).to.be('string with 1 replacement');
    });
    it('returns rendered template with two replacements', () => {
      const templateString = 'string with {{one}} replacement, and a {{two}} one.';
      const result = renderTemplate(templateString, { one: '1', two: '2nd' });
      expect(result).to.be('string with 1 replacement, and a 2nd one.');
    });
  });
});
