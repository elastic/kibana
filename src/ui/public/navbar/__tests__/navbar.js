import ngMock from 'ngMock';
import sinon from 'sinon';
import expect from 'expect.js';
import angular from 'angular';
import _ from 'lodash';

import navbarExtensionsRegistry from 'ui/registry/navbar_extensions';
import Registry from 'ui/registry/_registry';
import 'ui/navbar';

const defaultMarkup = `
  <navbar name="testing">
    <div class="button-group" role="toolbar">
      <button>
        <i aria-hidden="true" class="fa fa-file-new-o"></i>
      </button>
      <button>
        <i aria-hidden="true" class="fa fa-save"></i>
      </button>
      <button>
        <i aria-hidden="true" class="fa fa-folder-open-o"></i>
      </button>
    </div>
  </navbar>`;


describe('navbar directive', function () {
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
      const markup = `<navbar><div class="button-group" role="toolbar"></div></navbar>`;
      expect(() => init(markup)).to.throwException(/requires a name attribute/);
    });

    it('should throw if missing a button group', function () {
      const markup = `<navbar name="testing"></navbar>`;
      expect(() => init(markup)).to.throwException(/must have exactly 1 button group/);
    });

    it('should throw if multiple button groups', function () {
      const markup = `  <navbar name="testing">
          <div class="button-group" role="toolbar">
            <button>
              <i aria-hidden="true" class="fa fa-file-new-o"></i>
            </button>
            <button>
              <i aria-hidden="true" class="fa fa-save"></i>
            </button>
          </div>
          <div class="button-group" role="toolbar">
            <button>
              <i aria-hidden="true" class="fa fa-folder-open-o"></i>
            </button>
          </div>
        </navbar>`;
      expect(() => init(markup)).to.throwException(/must have exactly 1 button group/);
    });

    it('should throw if button group not direct child', function () {
      const markup = `<navbar><div><div class="button-group" role="toolbar"></div></div></navbar>`;
      expect(() => init(markup)).to.throwException(/must have exactly 1 button group/);
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

    it('should use the default markup', function () {
      var $el = init();
      expect($el.find('.button-group button').length).to.equal(3);
    });

    it('should append to end then order == 0', function () {
      registerExtension({ order: 0 });
      var $el = init();

      expect($el.find('.button-group button').length).to.equal(4);
      expect($el.find('.button-group button').last().hasClass('test-button')).to.be.ok();
    });

    it('should append to end then order > 0', function () {
      registerExtension({ order: 1 });
      var $el = init();

      expect($el.find('.button-group button').length).to.equal(4);
      expect($el.find('.button-group button').last().hasClass('test-button')).to.be.ok();
    });

    it('should append to end then order < 0', function () {
      registerExtension({ order: -1 });
      var $el = init();

      expect($el.find('.button-group button').length).to.equal(4);
      expect($el.find('.button-group button').first().hasClass('test-button')).to.be.ok();
    });
  });
});
