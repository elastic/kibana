/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexDetailsLink, getIndexListUri } from './routing';

describe('routing', () => {
  describe('index details link', () => {
    it('adds the index name to the url', () => {
      const indexName = 'testIndex';
      const url = getIndexDetailsLink(indexName, '');
      expect(url).toContain(`indexName=${indexName}`);
    });

    it('adds the indices table parameters to the url', () => {
      const filter = 'isFollower:true';
      const url = getIndexDetailsLink('testIndex', `?filter=${encodeURIComponent(filter)}`);
      expect(url).toContain(`&filter=${encodeURIComponent(filter)}`);
    });

    it('adds an optional index details tab to the url', () => {
      const tab = 'dynamic-tab';
      const url = getIndexDetailsLink('testIndex', '', tab);
      expect(url).toContain(`tab=${tab}`);
    });
  });

  describe('indices list link', () => {
    it('adds filter to the url', () => {
      const filter = 'isFollower:true';
      const url = getIndexListUri(filter);
      expect(url).toContain(`?filter=${encodeURIComponent(filter)}`);
    });

    it('adds includeHiddenIndices param to the url', () => {
      const url = getIndexListUri('', true);
      expect(url).toContain(`?includeHiddenIndices=true`);
    });
  });
});
