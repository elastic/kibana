/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { urlTemplatesReducer } from './url_templates';
import { requestDatasource } from './datasource';
import { outlinkEncoders } from '../helpers/outlink_encoders';

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
      expect(templates[0].url).toContain('test-pattern');
    });
  });
});
