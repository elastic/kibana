import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';

describe('pattern checker', function () {
  let $httpBackend;
  let $compile;
  let $rootScope;
  let apiResponse;
  let $timeout;
  const notifyFatalStub = sinon.stub();

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.module(function ($provide) {
    notifyFatalStub.reset();

    $provide.value('Notifier', function () {
      this.fatal = notifyFatalStub;
    });
  }));

  beforeEach(ngMock.inject(function ($injector) {
    $httpBackend = $injector.get('$httpBackend');
    $compile = $injector.get('$compile');
    $rootScope = $injector.get('$rootScope');
    $timeout = $injector.get('$timeout');

    apiResponse = $httpBackend.when('POST', /\/api\/kibana\/.*\/_count/);
  }));

  it('should display the number of documents in a given index pattern', function () {
    apiResponse.respond(200, { count: 1 });

    const element = $compile('<pattern-checker pattern="logstash"></pattern-checker>')($rootScope);

    $httpBackend.flush();
    $rootScope.$digest();
    expect(_.contains(element.html(), `1 results`)).to.be.ok();
  });

  it('should poll the api for changes to the document count and update the ui', function () {
    apiResponse.respond(200, { count: 1 });

    const element = $compile('<pattern-checker pattern="logstash"></pattern-checker>')($rootScope);

    $httpBackend.flush();
    $rootScope.$digest();
    expect(_.contains(element.html(), `1 results`)).to.be.ok();

    apiResponse.respond(200, { count: 2 });
    $timeout.flush();
    $httpBackend.flush();
    $rootScope.$digest();
    expect(_.contains(element.html(), `2 results`)).to.be.ok();
  });

  it('should display 0 results when API responds with 404', function () {
    apiResponse.respond(404);

    const element = $compile('<pattern-checker pattern="logstash"></pattern-checker>')($rootScope);

    $httpBackend.flush();
    $rootScope.$digest();
    expect(_.contains(element.html(), `0 results`)).to.be.ok();
  });

  it('should throw a fatal notificaiton for any error other than a 404', function () {
    apiResponse.respond(500, 'Bad things happened');

    $compile('<pattern-checker pattern="logstash"></pattern-checker>')($rootScope);

    $httpBackend.flush();
    $rootScope.$digest();

    expect(notifyFatalStub.called).to.be.ok();
  });

  it('should stop polling when the scope is destroyed', function () {
    apiResponse.respond(200, { count: 1 });

    const element = $compile('<pattern-checker pattern="logstash"></pattern-checker>')($rootScope);
    const scope = element.scope();

    $httpBackend.flush();
    $rootScope.$digest();
    expect(_.contains(element.html(), `1 results`)).to.be.ok();

    scope.$destroy();
    $timeout.flush();
    $httpBackend.verifyNoOutstandingRequest();
  });

});
