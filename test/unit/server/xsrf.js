var request = require('supertest');
var expect = require('expect.js');

var app = require('../../../src/server/app');
var router = require('../../../src/server/routes');
var xsrfToken = require('../../../src/server/config').kibana.xsrf_token;

var nonDestructiveMethods = ['get'];
var destructiveMethods = ['post', 'put', 'delete'];

router.all('/xsrf/test/route', function (req, res) {
  res.send('ok');
});

describe('xsrf request filter', function () {
  describe('issuing tokens', function () {
    it('sends a token with /config', function (done) {
      request(app)
      .get('/config')
      .expect(function (res) {
        expect(res.body).to.have.property('xsrf_token', xsrfToken);
      })
      .end(done);
    });
  });

  nonDestructiveMethods.forEach(function (method) {
    context('nonDestructiveMethod: ' + method, function () {
      var req = function (path) {
        return request(app)[method](path);
      };

      it('accepts requests without a token', function (done) {
        req('/xsrf/test/route')
        .expect(200)
        .end(done);
      });

      it('ignores invalid tokens', function (done) {
        req('/xsrf/test/route')
        .set('kbn-xsrf-token', 'invalid:' + xsrfToken)
        .expect(200)
        .end(done);
      });
    });
  });

  destructiveMethods.forEach(function (method) {
    context('destructiveMethod: ' + method, function () {
      var req = function (path) {
        return request(app)[method](path);
      };

      it('accepts requests with the correct token', function (done) {
        req('/xsrf/test/route')
        .set('kbn-xsrf-token', xsrfToken)
        .expect(200)
        .end(done);
      });

      it('rejects requests without a token', function (done) {
        req('/xsrf/test/route')
        .expect(403)
        .expect(function (resp) {
          expect(resp.body).to.be('Missing XSRF token');
        })
        .end(done);
      });

      it('rejects requests with an invalid token', function (done) {
        req('/xsrf/test/route')
        .set('kbn-xsrf-token', 'invalid:' + xsrfToken)
        .expect(403)
        .expect(function (resp) {
          expect(resp.body).to.be('Invalid XSRF token');
        })
        .end(done);
      });
    });
  });
});
