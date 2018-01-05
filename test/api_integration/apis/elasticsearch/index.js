export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('elasticsearch', () => {
    before(() => esArchiver.load('elasticsearch'));
    after(() => esArchiver.unload('elasticsearch'));

    it('allows search to specific index', async () => (
      await supertest
        .post('/elasticsearch/elasticsearch/_search')
        .expect(200)
    ));

    it('allows msearch', async () => (
      await supertest
        .post('/elasticsearch/_msearch')
        .set('content-type', 'application/x-ndjson')
        .send('{"index":"logstash-2015.04.21","ignore_unavailable":true}\n{"size":500,"sort":{"@timestamp":"desc"},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"bool":{"must":[{"range":{"@timestamp":{"gte":1429577068175,"lte":1429577968175}}}],"must_not":[]}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"30s","min_doc_count":0,"extended_bounds":{"min":1429577068175,"max":1429577968175}}}},"stored_fields":["*"],"_source": true,"script_fields":{},"docvalue_fields":["timestamp_offset","@timestamp","utc_time"]}\n') // eslint-disable-line max-len
        .expect(200)
    ));

    it('rejects nodes API', async () => (
      await supertest
        .get('/elasticsearch/_nodes')
        .expect(404)
    ));

    it('rejects requests to root', async () => (
      await supertest
        .get('/elasticsearch')
        .expect(404)
    ));

    it('rejects POST to .kibana', async () => (
      await supertest
        .post('/elasticsearch/.kibana')
        .expect(404)
    ));

    it('rejects PUT to .kibana', async () => (
      await supertest
        .put('/elasticsearch/.kibana')
        .expect(404)
    ));

    it('rejects DELETE to .kibana', async () => (
      await supertest
        .delete('/elasticsearch/.kibana')
        .expect(404)
    ));

    it('rejects GET to .kibana', async () => (
      await supertest
        .get('/elasticsearch/.kibana')
        .expect(404)
    ));

    it('rejects bulk requests to .kibana', async () => (
      await supertest
        .post('/elasticsearch/.kibana/_bulk')
        .set('content-type', 'application/json')
        .send({})
        .expect(404)
    ));

    it('rejects validate API', async () => (
      await supertest
        .post('/elasticsearch/.kibana/__kibanaQueryValidator/_validate/query?explain=true&ignore_unavailable=true')
        .set('content-type', 'application/json')
        .send({ query: { query_string: { analyze_wildcard: true, query: '*' } } })
        .expect(404)
    ));

    it('rejects mget', async () => (
      await supertest
        .post('/elasticsearch/_mget')
        .set('content-type', 'application/json')
        .send({ docs: [{ _index: 'elasticsearch', _id: 'somedocid' }] })
        .expect(404)
    ));
  });
}
