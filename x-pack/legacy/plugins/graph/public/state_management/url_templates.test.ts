/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { urlTemplatesReducer, saveTemplate } from './url_templates';
import { requestDatasource } from './datasource';
import { outlinkEncoders } from '../helpers/outlink_encoders';
import { UrlTemplate } from '../types';

describe('url_templates', () => {
  describe('reducer', () => {
    it('should create a default template as soon as datasource is known', () => {
      const templates = urlTemplatesReducer('basepath')(
        [],
        requestDatasource({
          type: 'indexpattern',
          id: '123456',
          title: 'test-pattern',
        })
      );
      expect(templates.length).toBe(1);
      expect(templates[0].encoder).toBe(outlinkEncoders[0]);
      expect(templates[0].url).not.toContain('test-pattern');
      expect(templates[0].url).toContain('123456');
      expect(templates[0].isDefault).toBe(true);
    });

    it('should keep non-default templates when switching datasource', () => {
      const templates = urlTemplatesReducer('basepath')(
        [
          {
            description: 'default template',
            isDefault: true,
          } as UrlTemplate,
          {
            description: 'custom template',
            isDefault: false,
          } as UrlTemplate,
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
      const templates = urlTemplatesReducer('basepath')(
        [
          {
            description: 'abc',
            isDefault: true,
          } as UrlTemplate,
        ],
        saveTemplate({
          index: 0,
          template: {
            description: 'def',
            isDefault: true,
          } as UrlTemplate,
        })
      );
      expect(templates.length).toBe(1);
      expect(templates[0].description).toBe('def');
      expect(templates[0].isDefault).toBe(false);
    });
  });
});
