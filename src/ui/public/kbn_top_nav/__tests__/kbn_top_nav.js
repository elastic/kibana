import ngMock from 'ng_mock';
import expect from 'expect.js';
import { assign, pluck } from 'lodash';
import $ from 'jquery';

import '../kbn_top_nav';
import { KbnTopNavControllerProvider } from '../kbn_top_nav_controller';

describe('kbnTopNav directive', function () {
  let build;
  let KbnTopNavController;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($compile, $rootScope, Private) {
    KbnTopNavController = Private(KbnTopNavControllerProvider);

    build = function (scopeVars = {}, attrs = {}) {
      const $el = $('<kbn-top-nav name="foo">').attr(attrs);
      const $scope = $rootScope.$new();
      assign($scope, scopeVars);
      $compile($el)($scope);
      $scope.$digest();
      return { $el, $scope };
    };
  }));

  it('sets the proper functions on the kbnTopNav prop on scope', function () {
    const { $scope } = build();
    expect($scope.kbnTopNav.open).to.be.a(Function);
    expect($scope.kbnTopNav.close).to.be.a(Function);
    expect($scope.kbnTopNav.getCurrent).to.be.a(Function);
    expect($scope.kbnTopNav.toggle).to.be.a(Function);
  });

  it('allows config at nested keys', function () {
    const scopeVars = {
      kbn: {
        top: {
          nav: [
            { key: 'foo' }
          ]
        }
      }
    };

    const { $scope } = build(scopeVars, { config: 'kbn.top.nav' });
    const optKeys = pluck($scope.kbnTopNav.opts, 'key');
    expect(optKeys).to.eql(['foo']);
  });

  it('uses the KbnTopNavController if passed via config attribute', function () {
    const controller = new KbnTopNavController();
    const { $scope } = build({ controller }, { config: 'controller' });
    expect($scope.kbnTopNav).to.be(controller);
  });
});
