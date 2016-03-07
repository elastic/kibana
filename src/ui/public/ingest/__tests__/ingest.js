import ngMock from 'ngMock';
import expect from 'expect.js';
import IngestProvider from '../ingest';
import sinon from 'auto-release-sinon';

describe('Ingest Service', function () {
  let $httpBackend;
  let ingest;
  let config;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    ingest = Private(IngestProvider);
    config = $injector.get('config');
    $httpBackend = $injector.get('$httpBackend');

    $rootScope = $injector.get('$rootScope');
    sinon.spy($rootScope, '$broadcast');
  }));

  it('Throws an error if an index pattern is not provided', function () {
    expect(ingest.save).to.throwException(/index pattern is required/);
  });

  it('Sets the default index if there isn\'t one already', function () {
    $httpBackend
    .when('POST', '../api/kibana/ingest')
    .respond('ok');

    expect(config.get('defaultIndex')).to.be(null);
    ingest.save({id: 'foo'});
    ingest.save({id: 'bar'});
    $httpBackend.flush();
    expect(config.get('defaultIndex')).to.be('foo');
  });

  it('Returns error from ingest API if there is one', function (done) {
    $httpBackend
    .expectPOST('../api/kibana/ingest')
    .respond(400);

    ingest.save({id: 'foo'})
    .then(
      () => {
        throw new Error('expected an error response');
      },
      (error) => {
        expect(error.status).to.be(400);
        done();
      }
    );

    $httpBackend.flush();
  });

  it('Broadcasts an ingest:updated event on the rootScope upon succesful save', function () {
    $httpBackend
    .when('POST', '../api/kibana/ingest')
    .respond('ok');

    ingest.save({id: 'foo'});
    $httpBackend.flush();

    expect($rootScope.$broadcast.calledOnce);
    expect($rootScope.$broadcast.calledWith('ingest:updated')).to.be.ok();
  });
});
