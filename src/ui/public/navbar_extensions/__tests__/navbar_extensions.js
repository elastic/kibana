import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';
import angular from 'angular';
import _ from 'lodash';

import navbarExtensionsRegistry from 'ui/registry/navbar_extensions';
import Registry from 'ui/registry/_registry';
import 'ui/navbar_extensions';

const defaultMarkup = `
  <navbar-extensions name="testing"></navbar-extensions>`;


describe('navbar-extensions directive', function () {
  let $rootScope;
  let $compile;
  let stubRegistry;

  beforeEach(function () {
    ngMock.module('kibana', function (PrivateProvider) {
      stubRegistry = new Registry({
        index: ['name'],
        group: ['appName'],
        order: ['order']
      });

      PrivateProvider.swap(navbarExtensionsRegistry, stubRegistry);
    });

    ngMock.module('kibana/navbar');

    // Create the scope
    ngMock.inject(function ($injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
    });
  });

  function init(markup = defaultMarkup) {
    // Give us a scope
    const $el = angular.element(markup);
    $compile($el)($rootScope);
    $el.scope().$digest();
    return $el;
  }

  describe('incorrect use', function () {
    it('should throw if missing a name property', function () {
      const markup = `<navbar-extensions><div class="button-group" role="toolbar"></div></navbar-extensions>`;
      expect(() => init(markup)).to.throwException(/requires a name attribute/);
    });
  });

  describe('injecting extensions', function () {
    function registerExtension(def = {}) {
      stubRegistry.register(function () {
        return _.defaults(def, {
          name: 'exampleButton',
          appName: 'testing',
          order: 0,
          template: `
            <button class="test-button">
              <i aria-hidden="true" class="fa fa-rocket"></i>
            </button>`
        });
      });
    }

    it('should append to end then order == 0', function () {
      registerExtension({ order: 0 });
      var $el = init();

      expect($el.find('button').last().hasClass('test-button')).to.be.ok();
    });

    it('should enforce the order prop', function () {
      registerExtension({
        order: 1,
        template: `
          <button class="test-button-1">
            <i aria-hidden="true" class="fa fa-rocket"></i>
          </button>`
      });
      registerExtension({
        order: 2,
        template: `
          <button class="test-button-2">
            <i aria-hidden="true" class="fa fa-rocket"></i>
          </button>`
      });
      registerExtension({
        order: 0,
        template: `
          <button class="test-button-0">
            <i aria-hidden="true" class="fa fa-rocket"></i>
          </button>`
      });
      var $el = init();

      expect($el.find('button').length).to.equal(3);
      expect($el.find('button').last().hasClass('test-button-2')).to.be.ok();
      expect($el.find('button').first().hasClass('test-button-0')).to.be.ok();
    });
  });
});
