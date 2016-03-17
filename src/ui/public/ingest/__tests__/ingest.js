import ngMock from 'ng_mock';
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

  describe('save', function () {
    it('Throws an error if an index pattern is not provided', function () {
      expect(ingest.save).to.throwException(/index pattern is required/);
    });

    it('Sets the default index if there isn\'t one already', function () {
      $httpBackend
      .when('POST', '/api/kibana/ingest')
      .respond('ok');

      expect(config.get('defaultIndex')).to.be(null);
      ingest.save({id: 'foo'});
      ingest.save({id: 'bar'});
      $httpBackend.flush();
      expect(config.get('defaultIndex')).to.be('foo');
    });

    it('Returns error from ingest API if there is one', function (done) {
      $httpBackend
      .expectPOST('/api/kibana/ingest')
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
      .when('POST', '/api/kibana/ingest')
      .respond('ok');

      ingest.save({id: 'foo'});
      $httpBackend.flush();

      expect($rootScope.$broadcast.calledOnce);
      expect($rootScope.$broadcast.calledWith('ingest:updated')).to.be.ok();
    });
  });

  describe('delete', function () {
    it('throws an error if no ingest id is provided', function () {
      expect(ingest.delete).to.throwException(/ingest id is required/);
    });

    it('Calls the DELETE endpoint of the ingest API with the given id', function () {
      $httpBackend
      .expectDELETE('/api/kibana/ingest/foo')
      .respond('ok');

      ingest.delete('foo');
      $httpBackend.flush();
    });

    it('Returns error from ingest API if there is one', function (done) {
      $httpBackend
      .expectDELETE('/api/kibana/ingest/foo')
      .respond(404);

      ingest.delete('foo')
      .then(
        () => {
          throw new Error('expected an error response');
        },
        (error) => {
          expect(error.status).to.be(404);
          done();
        }
      );

      $httpBackend.flush();
    });

    it('Broadcasts an ingest:updated event on the rootScope upon succesful save', function () {
      $httpBackend
      .when('DELETE', '/api/kibana/ingest/foo')
      .respond('ok');

      ingest.delete('foo');
      $httpBackend.flush();

      expect($rootScope.$broadcast.calledOnce);
      expect($rootScope.$broadcast.calledWith('ingest:updated')).to.be.ok();
    });
  });

  describe('uploadCSV', function () {
    it('throws an error if file and index pattern are not provided', function () {
      expect(ingest.uploadCSV).to.throwException(/file is required/);
      expect(ingest.uploadCSV).withArgs('foo').to.throwException(/index pattern is required/);
    });

    it('POSTs to the kibana _data endpoint with the correct params and the file attached as multipart/form-data', function () {
      $httpBackend
      .expectPOST('/api/kibana/foo/_data?csv_delimiter=;&pipeline=true', function (data) {
        // The assertions we can do here are limited because of poor browser support for FormData methods
        return data instanceof FormData;
      })
      .respond('ok');

      const file = new Blob(['foo,bar'], {type : 'text/csv'});

      ingest.uploadCSV(file, 'foo', ';', true);
      $httpBackend.flush();
    });

    it('Returns error from the data API if there is one', function (done) {
      $httpBackend
      .expectPOST('/api/kibana/foo/_data?csv_delimiter=;&pipeline=true')
      .respond(404);

      const file = new Blob(['foo,bar'], {type : 'text/csv'});

      ingest.uploadCSV(file, 'foo', ';', true)
      .then(
        () => {
          throw new Error('expected an error response');
        },
        (error) => {
          expect(error.status).to.be(404);
          done();
        }
      );

      $httpBackend.flush();
    });
  });

  describe('getProcessors', () => {

    it('Calls the processors GET endpoint of the ingest API', function () {
      $httpBackend
      .expectGET('/api/kibana/ingest/processors')
      .respond('ok');

      ingest.getProcessors();
      $httpBackend.flush();
    });

    it('Throws user-friendly error when there is an error in the request', function (done) {
      $httpBackend
      .when('GET', '/api/kibana/ingest/processors')
      .respond(404);

      ingest.getProcessors()
      .then(
        () => {
          throw new Error('expected an error response');
        },
        (error) => {
          expect(error.message).to.be('Error fetching enabled processors');
          done();
        });

      $httpBackend.flush();
    });

  });

});
