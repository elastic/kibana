/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  urlTemplatesReducer,
  saveTemplate,
  loadTemplates,
  type UrlTemplateState,
} from './url_templates';
import { requestDatasource } from './datasource';
import { outlinkEncoders } from '../helpers/outlink_encoders';
import type { UrlTemplate } from '../types';

describe('url_templates', () => {
  const addBasePath = (url: string) => `/test/s/custom/${url}`;

  describe('reducer', () => {
    it('should create a default template as soon as datasource is known', () => {
      const templates = urlTemplatesReducer(addBasePath)(
        [],
        requestDatasource({
          type: 'indexpattern',
          id: '123456',
          title: 'test-pattern',
        })
      );
      expect(templates.length).toBe(1);
      expect(templates[0].encoderId).toBe(outlinkEncoders[0].id);
      expect(templates[0].url).not.toContain('test-pattern');
      expect(templates[0].url).toContain('123456');
      expect(templates[0].isDefault).toBe(true);
    });

    it('should keep non-default templates when switching datasource', () => {
      const templates = urlTemplatesReducer(addBasePath)(
        [
          {
            id: 'default-template',
            description: 'default template',
            isDefault: true,
          } as UrlTemplateState,
          {
            id: 'custom-template',
            description: 'custom template',
            isDefault: false,
          } as UrlTemplateState,
        ],
        requestDatasource({
          type: 'indexpattern',
          id: '123456',
          title: 'test-pattern',
        })
      );
      // length is two because new default template is added
      expect(templates.length).toBe(2);
      expect(templates[0].description).toBe('custom template');
      expect(templates[1].description).toBe('Raw documents');
    });

    it('should remove isDefault flag when saving a template even if it is spreaded in', () => {
      const templates = urlTemplatesReducer(addBasePath)(
        [
          {
            id: 'existing-template',
            description: 'abc',
            isDefault: true,
          } as UrlTemplateState,
        ],
        saveTemplate({
          id: 'existing-template',
          template: {
            description: 'def',
            isDefault: true,
          } as UrlTemplate,
        })
      );
      expect(templates.length).toBe(1);
      expect(templates[0].description).toBe('def');
      expect(templates[0].isDefault).toBe(false);
      expect(templates[0].id).toBe('existing-template');
    });

    it('should patch default urls with a space-aware prefix', () => {
      const templates = urlTemplatesReducer(addBasePath)(
        [],
        loadTemplates([
          {
            url: '/app/discover?and-the-rest',
            isDefault: true,
          } as UrlTemplate,
          {
            url: 'https://example.com?and-the-rest',
            isDefault: true,
          } as UrlTemplate,
        ])
      );
      expect(templates.length).toBe(2);
      expect(templates[0].url).toBe('/test/s/custom//app/discover?and-the-rest');
      expect(templates[0].isDefault).toBe(true);
      expect(templates[1].url).toBe('https://example.com?and-the-rest');
      expect(templates[1].isDefault).toBe(true);
      expect(templates[0].id).toEqual(expect.any(String));
      expect(templates[1].id).toEqual(expect.any(String));
      expect(templates[0].id).not.toBe(templates[1].id);
    });
  });
});
