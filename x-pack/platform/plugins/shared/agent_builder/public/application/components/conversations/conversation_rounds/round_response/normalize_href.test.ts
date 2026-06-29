/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { normalizeHref } from './normalize_href';

// The browser base path already encodes BOTH the server base path and the active space — core
// sets it to `${serverBasePath}${/s/<spaceId>}`. So from this helper's perspective the four
// deployment combinations are just four values of a single base-path string. The http mock backs
// `basePath` with the real `BasePath` class, so we exercise the actual `prepend` logic.
const basePathFor = (value: string) =>
  httpServiceMock.createStartContract({ basePath: value }).basePath;

const RULE_PATH = '/app/security/rules/add_rules/abc-123';

describe('normalizeHref', () => {
  describe('root-relative paths across deployment combinations', () => {
    it('leaves the path unchanged in the default space with no server base path', () => {
      expect(normalizeHref(RULE_PATH, basePathFor(''))).toBe(RULE_PATH);
    });

    it('prepends the space segment in a custom space with no server base path', () => {
      expect(normalizeHref(RULE_PATH, basePathFor('/s/my-space'))).toBe(
        '/s/my-space/app/security/rules/add_rules/abc-123'
      );
    });

    it('prepends the server base path in the default space', () => {
      expect(normalizeHref(RULE_PATH, basePathFor('/kbn'))).toBe(
        '/kbn/app/security/rules/add_rules/abc-123'
      );
    });

    it('prepends base path + space exactly once in a custom space (no doubled segment)', () => {
      expect(normalizeHref(RULE_PATH, basePathFor('/kbn/s/my-space'))).toBe(
        '/kbn/s/my-space/app/security/rules/add_rules/abc-123'
      );
    });

    it('preserves the query string and fragment when prepending', () => {
      expect(normalizeHref(`${RULE_PATH}?tab=about#summary`, basePathFor('/kbn'))).toBe(
        '/kbn/app/security/rules/add_rules/abc-123?tab=about#summary'
      );
    });
  });

  describe('hrefs that must not be rewritten', () => {
    it('leaves absolute URLs untouched', () => {
      expect(normalizeHref('https://example.com/docs', basePathFor('/kbn'))).toBe(
        'https://example.com/docs'
      );
    });

    it('leaves protocol-relative URLs untouched', () => {
      expect(normalizeHref('//cdn.example.com/asset.js', basePathFor('/kbn'))).toBe(
        '//cdn.example.com/asset.js'
      );
    });

    it('leaves relative (non-root) paths untouched', () => {
      expect(normalizeHref('app/security/rules', basePathFor('/kbn'))).toBe('app/security/rules');
    });

    it('leaves fragment-only hrefs untouched', () => {
      expect(normalizeHref('#section', basePathFor('/kbn'))).toBe('#section');
    });
  });

  it('returns the href unchanged when the base path service is unavailable', () => {
    expect(normalizeHref(RULE_PATH, undefined)).toBe(RULE_PATH);
  });
});
