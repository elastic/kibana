/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizePipelineNameFromParams } from './normalize_pipeline_name_from_params';

describe('normalizePipelineNameFromParams', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/app/ingest_pipelines/edit/my-pipeline',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });

    jest.clearAllMocks();
  });

  describe('when pathname ends with unencoded route param', () => {
    it('should return route param unchanged', () => {
      const name = 'my-pipeline';
      window.location.pathname = `app/ingest_pipelines/edit/${name}`;

      const result = normalizePipelineNameFromParams(name);

      expect(result).toBe(name);
    });
  });

  describe('when pathname ends with URL-encoded route param', () => {
    it('should decode URL-encoded route param', () => {
      const name = encodeURIComponent('my-pipeline');
      window.location.pathname = `/app/ingest_pipelines/edit/${name}`;

      const result = normalizePipelineNameFromParams(name);

      expect(result).toBe('my-pipeline');
    });
  });

  describe('when pathname ends with route param containing special characters', () => {
    it('should handle special characters in route param', () => {
      const name = encodeURIComponent('my-pipeline+test');
      window.location.pathname = `/app/ingest_pipelines/edit/${name}`;

      const result = normalizePipelineNameFromParams(name);

      expect(result).toBe('my-pipeline+test');
    });
  });

  describe('when pathname does not end with the route param', () => {
    it('should extract and decode the last segment of the pathname', () => {
      // simulating history v4 bug with space instead of +
      // for context, see https://github.com/elastic/kibana/issues/234500
      const name = encodeURI('my>pipeline+test');
      window.location.pathname = `/app/ingest_pipelines/edit/${encodeURIComponent(
        'my>pipeline+test'
      )}`;

      const result = normalizePipelineNameFromParams(name);

      expect(result).toBe('my>pipeline+test');
    });
  });
});
