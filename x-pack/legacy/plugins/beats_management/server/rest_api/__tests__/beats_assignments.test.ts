/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMServerLibs } from '../../lib/types';
import { HapiBackendFrameworkAdapter } from './../../lib/adapters/framework/hapi_framework_adapter';
import { testHarnes } from './test_harnes';

describe('assign_tags_to_beats', () => {
  let serverLibs: CMServerLibs;

  beforeAll(async () => {
    jest.setTimeout(100000); // 1 second

    serverLibs = await testHarnes.getServerLibs();
  });
  beforeEach(async () => await testHarnes.loadData());

  it('should add a single tag to a single beat', async () => {
    const { result, statusCode } = await ((serverLibs.framework as any)
      .adapter as HapiBackendFrameworkAdapter).injectRequstForTesting({
      method: 'POST',
      url: '/api/beats/agents_tags/assignments',
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: 'loggedin',
      },
      payload: {
        assignments: [{ beatId: 'bar', tag: 'production' }],
      },
    });

    expect(statusCode).toEqual(200);
    expect(result.results).toEqual([{ success: true, result: { message: 'updated' } }]);
  });

  it('should not re-add an existing tag to a beat', async () => {
    const { result, statusCode } = await ((serverLibs.framework as any)
      .adapter as HapiBackendFrameworkAdapter).injectRequstForTesting({
      method: 'POST',
      url: '/api/beats/agents_tags/assignments',
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: 'loggedin',
      },
      payload: {
        assignments: [{ beatId: 'foo', tag: 'production' }],
      },
    });

    expect(statusCode).toEqual(200);

    expect(result.results).toEqual([{ success: true, result: { message: 'updated' } }]);

    const beat = await serverLibs.beats.getById(
      {
        kind: 'internal',
      },
      'foo'
    );
    expect(beat!.tags).toEqual(['production', 'qa']); // as
  });

  it('should add a single tag to a multiple beats', async () => {
    const { result, statusCode } = await ((serverLibs.framework as any)
      .adapter as HapiBackendFrameworkAdapter).injectRequstForTesting({
      method: 'POST',
      url: '/api/beats/agents_tags/assignments',
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: 'loggedin',
      },
      payload: {
        assignments: [{ beatId: 'foo', tag: 'development' }, { beatId: 'bar', tag: 'development' }],
      },
    });

    expect(statusCode).toEqual(200);

    expect(result.results).toEqual([
      { success: true, result: { message: 'updated' } },
      { success: true, result: { message: 'updated' } },
    ]);

    let beat;

    beat = await serverLibs.beats.getById(
      {
        kind: 'internal',
      },
      'foo'
    );
    expect(beat!.tags).toEqual(['production', 'qa', 'development']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

    // Beat bar
    beat = await serverLibs.beats.getById(
      {
        kind: 'internal',
      },
      'bar'
    );

    expect(beat!.tags).toEqual(['development']);
  });

  it('should add multiple tags to a single beat', async () => {
    const { result, statusCode } = await ((serverLibs.framework as any)
      .adapter as HapiBackendFrameworkAdapter).injectRequstForTesting({
      method: 'POST',
      url: '/api/beats/agents_tags/assignments',
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: 'loggedin',
      },
      payload: {
        assignments: [{ beatId: 'bar', tag: 'development' }, { beatId: 'bar', tag: 'production' }],
      },
    });

    expect(statusCode).toEqual(200);

    expect(result.results).toEqual([
      { success: true, result: { message: 'updated' } },
      { success: true, result: { message: 'updated' } },
    ]);

    const beat = await serverLibs.beats.getById(
      {
        kind: 'internal',
      },
      'bar'
    );

    expect(beat!.tags).toEqual(['development', 'production']);
  });

  // it('should add multiple tags to a multiple beats', async () => {
  //   const { body: apiResponse } = await supertest
  //     .post('/api/beats/agents_tags/assignments')
  //     .set('kbn-xsrf', 'xxx')
  //     .send({
  //       assignments: [{ beatId: 'foo', tag: 'development' }, { beatId: 'bar', tag: 'production' }],
  //     })
  //     .expect(200);

  //   expect(apiResponse.assignments).to.eql([
  //     { status: 200, result: 'updated' },
  //     { status: 200, result: 'updated' },
  //   ]);

  //   let esResponse;
  //   let beat;

  //   // Beat foo
  //   esResponse = await es.get({
  //     index: ES_INDEX_NAME,
  //     type: ES_TYPE_NAME,
  //     id: `beat:foo`,
  //   });

  //   beat = esResponse._source.beat;
  //   expect(beat.tags).to.eql(['production', 'qa', 'development']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

  //   // Beat bar
  //   esResponse = await es.get({
  //     index: ES_INDEX_NAME,
  //     type: ES_TYPE_NAME,
  //     id: `beat:bar`,
  //   });

  //   beat = esResponse._source.beat;
  //   expect(beat.tags).to.eql(['production']);
  // });

  // it('should return errors for non-existent beats', async () => {
  //   const nonExistentBeatId = chance.word();

  //   const { body: apiResponse } = await supertest
  //     .post('/api/beats/agents_tags/assignments')
  //     .set('kbn-xsrf', 'xxx')
  //     .send({
  //       assignments: [{ beatId: nonExistentBeatId, tag: 'production' }],
  //     })
  //     .expect(200);

  //   expect(apiResponse.assignments).to.eql([
  //     { status: 404, result: `Beat ${nonExistentBeatId} not found` },
  //   ]);
  // });

  // it('should return errors for non-existent tags', async () => {
  //   const nonExistentTag = chance.word();

  //   const { body: apiResponse } = await supertest
  //     .post('/api/beats/agents_tags/assignments')
  //     .set('kbn-xsrf', 'xxx')
  //     .send({
  //       assignments: [{ beatId: 'bar', tag: nonExistentTag }],
  //     })
  //     .expect(200);

  //   expect(apiResponse.assignments).to.eql([
  //     { status: 404, result: `Tag ${nonExistentTag} not found` },
  //   ]);

  //   const esResponse = await es.get({
  //     index: ES_INDEX_NAME,
  //     type: ES_TYPE_NAME,
  //     id: `beat:bar`,
  //   });

  //   const beat = esResponse._source.beat;
  //   expect(beat).to.not.have.property('tags');
  // });

  // it('should return errors for non-existent beats and tags', async () => {
  //   const nonExistentBeatId = chance.word();
  //   const nonExistentTag = chance.word();

  //   const { body: apiResponse } = await supertest
  //     .post('/api/beats/agents_tags/assignments')
  //     .set('kbn-xsrf', 'xxx')
  //     .send({
  //       assignments: [{ beatID: nonExistentBeatId, tag: nonExistentTag }],
  //     })
  //     .expect(200);

  //   expect(apiResponse.assignments).to.eql([
  //     { status: 404, result: `Beat ${nonExistentBeatId} and tag ${nonExistentTag} not found` },
  //   ]);

  //   const esResponse = await es.get({
  //     index: ES_INDEX_NAME,
  //     type: ES_TYPE_NAME,
  //     id: `beat:bar`,
  //   });

  //   const beat = esResponse._source.beat;
  //   expect(beat).to.not.have.property('tags');
  // });
});
