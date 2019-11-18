/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isWebUrl, relativeToAbsolute } from './url_utils';

describe('ML - URL utils', () => {
  const TEST_DISCOVER_URL =
    "kibana#/discover?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))" +
    "&_a=(index:'38288750-1884-11e8-b207-d9cfd2566581',query:(language:lucene,query:'airline:$airline$'))";

  const TEST_DASHBOARD_URL =
    'kibana#/dashboard/cc295990-1d19-11e8-b271-015e33f55cb6?' +
    "_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))" +
    "&_a=(filters:!(),query:(language:lucene,query:'instance:$instance$ AND region:$region$'))";
  describe('isWebUrl', () => {
    test('returns true for http URLs', () => {
      expect(isWebUrl('http://airlinecodes.info/airline-code-$airline$')).toBe(true);
      expect(isWebUrl('http://www.google.co.uk/search?q=airline+code+$airline$')).toBe(true);
      expect(isWebUrl('http://showcase.server.com:5601/')).toBe(true);
      expect(isWebUrl('http://10.1.2.3/myapp/query=test')).toBe(true);
    });

    test('returns true for https URLs', () => {
      expect(isWebUrl('https://www.google.co.uk/search?q=airline+code+$airline$')).toBe(true);
    });

    test('returns true for relative web URLs', () => {
      expect(isWebUrl(TEST_DISCOVER_URL)).toBe(true);
      expect(isWebUrl(TEST_DASHBOARD_URL)).toBe(true);
    });

    test('returns false for non web URLs', () => {
      expect(isWebUrl('javascript:console.log(window)')).toBe(false); // eslint-disable-line no-script-url
      expect(isWebUrl('ftp://admin@10.1.2.3/')).toBe(false);
      expect(isWebUrl('mailto:someone@example.com?Subject=Hello%20again')).toBe(false);
    });
  });

  describe('relativeToAbsolute', () => {
    test('leaves absolute URLs unchanged', () => {
      expect(relativeToAbsolute('http://elastic.co/')).toBe('http://elastic.co/');
      expect(relativeToAbsolute('https://www.google.co.uk/search?q=elastic')).toBe(
        'https://www.google.co.uk/search?q=elastic'
      );
    });

    test('converts relative URLs to absolute URLs', () => {
      expect(relativeToAbsolute(TEST_DASHBOARD_URL)).toMatch(/^(https?:\/\/)/);
    });
  });
});
