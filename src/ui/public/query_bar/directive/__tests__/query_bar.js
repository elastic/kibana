import angular from 'angular';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../test_utils/expect_deep_equal.js';

let $parentScope;
let $elem;

const markup = `<query-bar query="query" app-name="name" on-submit="submitHandler($query)"></query-bar>`;
const cleanup = [];

function init(query, name) {
  ngMock.module('kibana');

  ngMock.inject(function ($injector, $controller, $rootScope, $compile) {
    $parentScope = $rootScope;

    $parentScope.submitHandler = sinon.stub();
    $parentScope.name = name;
    $parentScope.query = query;
    $elem = angular.element(markup);
    angular.element('body').append($elem);
    cleanup.push(() => $elem.remove());

    $compile($elem)($parentScope);
    $elem.scope().$digest();
  });
}


describe('queryBar directive', function () {
  afterEach(() => {
    cleanup.forEach(fn => fn());
    cleanup.length = 0;
  });

  describe('query string input', function () {

    it('should reflect the query passed into the directive', function () {
      init({ query: 'foo', language: 'lucene' }, 'discover');
      const queryInput = $elem.find('.kuiLocalSearchInput');
      expect(queryInput.val()).to.be('foo');
    });

    it('changes to the input text should not modify the parent scope\'s query', function () {
      init({ query: 'foo', language: 'lucene' }, 'discover');
      const queryInput = $elem.find('.kuiLocalSearchInput');
      queryInput.val('bar').trigger('input');

      expect($elem.isolateScope().queryBar.localQuery.query).to.be('bar');
      expect($parentScope.query.query).to.be('foo');
    });

    it('should not call onSubmit until the form is submitted', function () {
      init({ query: 'foo', language: 'lucene' }, 'discover');
      const queryInput = $elem.find('.kuiLocalSearchInput');
      queryInput.val('bar').trigger('input');
      expect($parentScope.submitHandler.notCalled).to.be(true);

      const submitButton = $elem.find('.kuiLocalSearchButton');
      submitButton.click();
      expect($parentScope.submitHandler.called).to.be(true);
    });

    it('should call onSubmit with the current input text when the form is submitted', function () {
      init({ query: 'foo', language: 'lucene' }, 'discover');
      const queryInput = $elem.find('.kuiLocalSearchInput');
      queryInput.val('bar').trigger('input');
      const submitButton = $elem.find('.kuiLocalSearchButton');
      submitButton.click();
      expectDeepEqual($parentScope.submitHandler.getCall(0).args[0], { query: 'bar', language: 'lucene' });
    });

  });

  describe('typeahead key', function () {

    it('should use a unique typeahead key for each appName/language combo', function () {
      init({ query: 'foo', language: 'lucene' }, 'discover');
      expect($elem.isolateScope().queryBar.persistedLog.name).to.be('typeahead:discover-lucene');

      $parentScope.query = { query: 'foo', language: 'kuery' };
      $parentScope.$digest();
      expect($elem.isolateScope().queryBar.persistedLog.name).to.be('typeahead:discover-kuery');
    });

  });


});
