/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('main', () => {
    const basicIndex = 'ba*ic_index';
    let indexPattern: any;

    before(async () => {
      await esArchiver.load('index_patterns/basic_index');

      indexPattern = (
        await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title: basicIndex,
          },
        })
      ).body.index_pattern;
    });

    after(async () => {
      await esArchiver.unload('index_patterns/basic_index');

      if (indexPattern) {
        await supertest.delete('/api/index_patterns/index_pattern/' + indexPattern.id);
      }
    });

    it('can update multiple fields', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });

      expect(response1.status).to.be(200);
      expect(response1.body.index_pattern.fieldAttrs.foo).to.be(undefined);
      expect(response1.body.index_pattern.fieldAttrs.bar).to.be(undefined);

      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
        .send({
          fields: {
            foo: {
              count: 123,
              customLabel: 'test',
            },
            bar: {
              count: 456,
            },
          },
        });

      expect(response2.status).to.be(200);
      expect(response2.body.index_pattern.fieldAttrs.foo.count).to.be(123);
      expect(response2.body.index_pattern.fieldAttrs.foo.customLabel).to.be('test');
      expect(response2.body.index_pattern.fieldAttrs.bar.count).to.be(456);

      const response3 = await supertest.get(
        `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
      );

      expect(response3.status).to.be(200);
      expect(response3.body.index_pattern.fieldAttrs.foo.count).to.be(123);
      expect(response3.body.index_pattern.fieldAttrs.foo.customLabel).to.be('test');
      expect(response3.body.index_pattern.fieldAttrs.bar.count).to.be(456);
    });

    describe('count', () => {
      it('can set field "count" attribute on non-existing field', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldAttrs.foo).to.be(undefined);

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                count: 123,
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldAttrs.foo.count).to.be(123);

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldAttrs.foo.count).to.be(123);
      });

      it('can update "count" attribute in index_pattern attribute map', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            fieldAttrs: {
              foo: {
                count: 1,
              },
            },
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldAttrs.foo.count).to.be(1);

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                count: 2,
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldAttrs.foo.count).to.be(2);

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldAttrs.foo.count).to.be(2);
      });

      it('can delete "count" attribute from index_pattern attribute map', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            fieldAttrs: {
              foo: {
                count: 1,
              },
            },
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldAttrs.foo.count).to.be(1);

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                count: null,
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldAttrs.foo.count).to.be(undefined);

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldAttrs.foo.count).to.be(undefined);
      });
    });

    describe('customLabel', () => {
      it('can set field "customLabel" attribute on non-existing field', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldAttrs.foo).to.be(undefined);

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                customLabel: 'foo',
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldAttrs.foo.customLabel).to.be('foo');

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldAttrs.foo.customLabel).to.be('foo');
      });

      it('can update "customLabel" attribute in index_pattern attribute map', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            fieldAttrs: {
              foo: {
                customLabel: 'foo',
              },
            },
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldAttrs.foo.customLabel).to.be('foo');

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                customLabel: 'bar',
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldAttrs.foo.customLabel).to.be('bar');

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldAttrs.foo.customLabel).to.be('bar');
      });

      it('can delete "customLabel" attribute from index_pattern attribute map', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            fieldAttrs: {
              foo: {
                customLabel: 'foo',
              },
            },
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldAttrs.foo.customLabel).to.be('foo');

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                customLabel: null,
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldAttrs.foo.customLabel).to.be(undefined);

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldAttrs.foo.customLabel).to.be(undefined);
      });

      it('can set field "customLabel" attribute on an existing field', async () => {
        await supertest.post(`/api/index_patterns/index_pattern/${indexPattern.id}/fields`).send({
          fields: {
            foo: {
              customLabel: 'baz',
            },
          },
        });

        const response1 = await supertest.get(
          `/api/index_patterns/index_pattern/${indexPattern.id}`
        );

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fields.foo.customLabel).to.be('baz');
      });
    });

    describe('format', () => {
      it('can set field "format" attribute on non-existing field', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldFormats.foo).to.be(undefined);

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                format: {
                  id: 'bar',
                  params: { baz: 'qux' },
                },
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'bar',
          params: { baz: 'qux' },
        });

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'bar',
          params: { baz: 'qux' },
        });
      });

      it('can update "format" attribute in index_pattern format map', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            fieldFormats: {
              foo: {
                id: 'bar',
                params: {
                  baz: 'qux',
                },
              },
            },
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'bar',
          params: {
            baz: 'qux',
          },
        });

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                format: {
                  id: 'bar-2',
                  params: { baz: 'qux-2' },
                },
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'bar-2',
          params: { baz: 'qux-2' },
        });

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'bar-2',
          params: { baz: 'qux-2' },
        });
      });

      it('can remove "format" attribute from index_pattern format map', async () => {
        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${indexPattern.id}/fields`)
          .send({
            fields: {
              foo: {
                format: null,
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldFormats.foo).to.be(undefined);

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${indexPattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldFormats.foo).to.be(undefined);
      });

      it('can set field "format" on an existing field', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            fields: {
              foo: {
                name: 'foo',
                type: 'string',
                scripted: true,
                format: {
                  id: 'string',
                },
              },
            },
          },
        });

        expect(response1.status).to.be(200);
        expect(response1.body.index_pattern.fieldFormats.foo).to.be(undefined);
        expect(response1.body.index_pattern.fields.foo.format).to.eql({
          id: 'string',
        });

        const response2 = await supertest
          .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
          .send({
            fields: {
              foo: {
                format: { id: 'number' },
              },
            },
          });

        expect(response2.status).to.be(200);
        expect(response2.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'number',
        });
        expect(response2.body.index_pattern.fields.foo.format).to.eql({
          id: 'number',
        });

        const response3 = await supertest.get(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}`
        );

        expect(response3.status).to.be(200);
        expect(response3.body.index_pattern.fieldFormats.foo).to.eql({
          id: 'number',
        });
        expect(response3.body.index_pattern.fields.foo.format).to.eql({
          id: 'number',
        });
      });
    });
  });
}
