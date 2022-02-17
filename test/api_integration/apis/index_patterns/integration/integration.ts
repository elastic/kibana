/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import _ from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Test usage of different index patterns APIs in combination
 */
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('integration', () => {
    before(async () => {
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    it('create an index pattern, add a runtime field, add a field formatter, then re-create the same index pattern', async () => {
      const title = `basic_index*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: {
          title,
        },
      });
      const id = response1.body.index_pattern.id;
      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/runtime_field`)
        .send({
          name: 'runtimeBar',
          runtimeField: {
            type: 'long',
            script: {
              source: "emit(doc['field_name'].value)",
            },
          },
        });

      expect(response2.status).to.be(200);

      const response3 = await supertest
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
        .send({
          fields: {
            runtimeBar: {
              count: 123,
              customLabel: 'test',
            },
          },
        });

      expect(response3.status).to.be(200);

      const response4 = await supertest
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
        .send({
          fields: {
            runtimeBar: {
              format: {
                id: 'duration',
                params: { inputFormat: 'milliseconds', outputFormat: 'humanizePrecise' },
              },
            },
          },
        });

      expect(response4.status).to.be(200);

      const response5 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response5.status).to.be(200);

      const resultIndexPattern = response5.body.index_pattern;

      const runtimeField = resultIndexPattern.fields.runtimeBar;
      expect(runtimeField.name).to.be('runtimeBar');
      expect(runtimeField.runtimeField.type).to.be('long');
      expect(runtimeField.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
      expect(runtimeField.scripted).to.be(false);

      expect(resultIndexPattern.fieldFormats.runtimeBar.id).to.be('duration');
      expect(resultIndexPattern.fieldFormats.runtimeBar.params.inputFormat).to.be('milliseconds');
      expect(resultIndexPattern.fieldFormats.runtimeBar.params.outputFormat).to.be(
        'humanizePrecise'
      );

      expect(resultIndexPattern.fieldAttrs.runtimeBar.count).to.be(123);
      expect(resultIndexPattern.fieldAttrs.runtimeBar.customLabel).to.be('test');

      // check that retrieved object is transient and a clone can be created
      const response6 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: resultIndexPattern,
      });

      expect(response6.status).to.be(200);
      const recreatedIndexPattern = response6.body.index_pattern;

      expect(_.omit(recreatedIndexPattern, 'version')).to.eql(
        _.omit(resultIndexPattern, 'version')
      );
    });
  });
}
