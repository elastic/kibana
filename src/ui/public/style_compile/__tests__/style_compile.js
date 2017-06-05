import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
describe('styleCompile directive', function () {

  let config;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    config = $injector.get('config');
    $rootScope = $injector.get('$rootScope');
  }));

  it('exports a few config values as css', function () {
    const $style = $('#style-compile');

    config.set('truncate:maxHeight', 0);
    $rootScope.$apply();
    expect($style.html().trim()).to.be([
      '.truncate-by-height {',
      '  max-height: none;',
      '  display: inline-block;',
      '}',
      '.truncate-by-height:before {',
      '  top: -15px;',
      '}'
    ].join('\n'));

    config.set('truncate:maxHeight', 15);
    $rootScope.$apply();
    expect($style.html().trim()).to.be([
      '.truncate-by-height {',
      '  max-height: 15px !important;',
      '  display: inline-block;',
      '}',
      '.truncate-by-height:before {',
      '  top: 0px;',
      '}'
    ].join('\n'));
  });
});
