/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';

describe('ML - <ml-loading-indicator>', () => {
  let $scope;
  let $compile;
  let $element;

  beforeEach(() => {
    ngMock.module('apps/ml');
    ngMock.inject(function (_$compile_, $rootScope) {
      $compile = _$compile_;
      $scope = $rootScope.$new();
    });
  });

  afterEach(function () {
    $scope.$destroy();
  });

  it('Default loading indicator without attributes should not be visible', () => {
    $element = $compile('<ml-loading-indicator />')($scope);
    $scope.$apply();
    $element.on('renderComplete', () => {
      expect($element.find('*').length).to.be(0);
    });
  });

  it('Enables the loading indicator, checks the default height and non-existant label', () => {
    $element = $compile('<ml-loading-indicator is-loading="true" />')($scope);
    $scope.$apply();
    $element.on('renderComplete', () => {
      expect($element.find('.loading-indicator').length).to.be(1);
      expect($element.find('.loading-indicator').css('height')).to.be('100px');
      expect($element.find('[ml-loading-indicator-label]').length).to.be(0);
    });
  });

  it('Sets a custom height', () => {
    $element = $compile('<ml-loading-indicator is-loading="true" height="200" />')($scope);
    $scope.$apply();
    $element.on('renderComplete', () => {
      expect($element.find('.loading-indicator').css('height')).to.be('200px');
    });
  });

  it('Sets a custom label', () => {
    const labelName = 'my-label';
    $element = $compile(`<ml-loading-indicator is-loading="true" label="${labelName}" />`)($scope);
    $scope.$apply();
    $element.on('renderComplete', () => {
      expect($element.find('[ml-loading-indicator-label]').text()).to.be(labelName);
    });
  });

  it('Triggers a scope-change of isLoading', () => {
    $scope.isLoading = false;
    $element = $compile('<ml-loading-indicator is-loading="isLoading" />')($scope);
    $scope.$apply();

    $element.on('renderComplete', () => {
      expect($element.find('*').length).to.be(0);

      $scope.isLoading = true;
      $scope.$apply();
      $element.on('renderComplete', () => {
        expect($element.find('.loading-indicator').length).to.be(1);
      });
    });
  });
});
