/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import { removeFilterFromQueryString, getQueryPattern, escapeRegExp } from '../utils';

describe('ML - KqlFilterBar utils', () => {
  const fieldName = 'http.response.status_code';
  const fieldValue = '200';
  const speciaCharFieldName = 'normal(brackets)name';
  const speciaCharFieldValue = '<>:;[})';

  describe('removeFilterFromQueryString', () => {

    it('removes selected fieldName/fieldValue from query string with one value', () => {
      const currentQueryString = 'http.response.status_code : "200"';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue of type number from existing query string with one value', () => {
      const currentQueryString = 'http.response.status_code : 200';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue from query string with multiple values', () => {
      const currentQueryString = 'test_field : test_value or http.response.status_code : "200"';
      const expectedOutput = 'test_field : test_value';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue of type number from existing query string with multiple values', () => {
      const currentQueryString = 'http.response.status_code : 200 or test_field : test_value';
      const expectedOutput = 'test_field : test_value';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'and\' from end of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = 'http.response.status_code : "200" and';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'or\' from end of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = 'http.response.status_code : "200" or';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'and\' from start of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = ' and http.response.status_code : "200"';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'or\' from start of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = ' or http.response.status_code : "200" ';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue correctly from  AND query string when it is the middle value', () => {
      const currentQueryString = `http.response.status_code : "400" and http.response.status_code : "200"
        and http.response.status_code : "300"`;
      const expectedOutput = 'http.response.status_code : "400" and http.response.status_code : "300"';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue correctly from OR query string when it is the middle value', () => {
      const currentQueryString = `http.response.status_code : "400" or http.response.status_code : "200"
        or http.response.status_code : "300"`;
      const expectedOutput = 'http.response.status_code : "400" or http.response.status_code : "300"';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

  });

  describe('getQueryPattern', () => {

    it('creates a regular expression pattern for given fieldName/fieldValue', () => {
      // The source property returns a String containing the source text of the regexp object
      // and it doesn't contain the two forward slashes on both sides and any flags.
      const expectedOutput = /(http\.response\.status_code)\s?:\s?(")?(200)(")?/i.source;
      const result = getQueryPattern(fieldName, fieldValue).source;
      expect(result).to.be(expectedOutput);
    });

    it('creates a regular expression pattern for given fieldName/fieldValue containing special characters', () => {
      // The source property returns a String containing the source text of the regexp object
      // and it doesn't contain the two forward slashes on both sides and any flags.
      const expectedOutput = /(normal\(brackets\)name)\s?:\s?(")?(<>:;\[\}\))(")?/i.source;
      const result = getQueryPattern(speciaCharFieldName, speciaCharFieldValue).source;
      expect(result).to.be(expectedOutput);
    });

  });

  describe('escapeRegExp', () => {

    it('escapes regex special characters for given fieldName/fieldValue', () => {
      // The source property returns a String containing the source text of the regexp object
      // and it doesn't contain the two forward slashes on both sides and any flags.
      const expectedFieldName = 'normal\\(brackets\\)name';
      const expectedFieldValue = '<>:;\\[\\}\\)';
      const resultFieldName = escapeRegExp(speciaCharFieldName);
      const resultFieldValue = escapeRegExp(speciaCharFieldValue);

      expect(resultFieldName).to.be(expectedFieldName);
      expect(resultFieldValue).to.be(expectedFieldValue);
    });

  });

});
