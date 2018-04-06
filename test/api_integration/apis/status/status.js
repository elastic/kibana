import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('kibana status api', () => {
    it('returns version, status and metrics fields', () => {
      return supertest
        .get('/api/status')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          expect(body.name).to.be.a('string');
          expect(body.uuid).to.be.a('string');
          expect(body.version.number).to.be.a('string');
          expect(body.version.build_hash).to.be.a('string');
          expect(body.version.build_number).to.be.a('number');

          expect(body.status.overall).to.be.an('object');
          expect(body.status.overall.state).to.be('green');

          expect(body.status.statuses).to.be.an('array');
          const kibanaPlugin = body.status.statuses.find(s => {
            return s.id.indexOf('plugin:kibana') === 0;
          });
          expect(kibanaPlugin.state).to.be('green');

          expect(body.metrics.collection_interval_in_millis).to.be.a('number');

          expect(body.metrics.process.mem.heap_max_in_bytes).to.be.a('number');
          expect(body.metrics.process.mem.heap_used_in_bytes).to.be.a('number');

          expect(body.metrics.os.cpu.load_average['1m']).to.be.a('number');
          expect(body.metrics.os.cpu.load_average['5m']).to.be.a('number');
          expect(body.metrics.os.cpu.load_average['15m']).to.be.a('number');

          // TODO: fix this in the status/metrics class so this is always defined
          // expect(body.metrics.response_times.avg_in_millis).not.to.be(undefined); // a number, but is null if no measurements have yet been collected for averaging
          expect(body.metrics.response_times.max_in_millis).to.be.a('number');

          expect(body.metrics.requests.total).to.be.a('number');
          expect(body.metrics.requests.disconnects).to.be.a('number');
          expect(body.metrics.requests.status_codes).to.be.an('object');
          expect(body.metrics.concurrent_connections).to.be.a('number');
        });
    });
  });
}
