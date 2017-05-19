import angular from 'angular';
import $ from 'jquery';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';
import { escape } from 'lodash';

import { IndexPatternsFieldFormatContentTypesProvider } from '../content_types';

describe('index_patterns/_field_format/content_types', () => {

  let render;
  const callMe = sinon.stub();
  afterEach(() => callMe.reset());

  function getAllContents(node) {
    return [...node.childNodes].reduce((acc, child) => {
      return acc.concat(child, getAllContents(child));
    }, []);
  }

  angular.module('testApp', [])
    .directive('testDirective', () => ({
      restrict: 'EACM',
      link: callMe
    }));

  beforeEach(ngMock.module('testApp'));
  beforeEach(ngMock.inject(($injector) => {
    const contentTypes = new IndexPatternsFieldFormatContentTypesProvider();
    const $rootScope = $injector.get('$rootScope');
    const $compile = $injector.get('$compile');

    $rootScope.callMe = callMe;

    render = (convert) => {
      const $el = $('<div>');
      const { html } = contentTypes.setup({ _convert: { html: convert } });
      $compile($el.html(html(`
        <!-- directive: test-directive -->
        <div></div>
        <test-directive>{{callMe()}}</test-directive>
        <span test-directive></span>
        <marquee class="test-directive"></marquee>
      `)))($rootScope);
      return $el;
    };
  }));

  it('no element directive', () => {
    const $el = render(value => `
      <test-directive>${escape(value)}</test-directive>
    `);

    expect($el.find('test-directive')).to.have.length(1);
    sinon.assert.notCalled(callMe);
  });

  it('no attribute directive', () => {
    const $el = render(value => `
      <div test-directive>${escape(value)}</div>
    `);

    expect($el.find('[test-directive]')).to.have.length(1);
    sinon.assert.notCalled(callMe);
  });

  it('no comment directive', () => {
    const $el = render(value => `
      <!-- directive: test-directive -->
      <div>${escape(value)}</div>
    `);

    const comments = getAllContents($el.get(0))
      .filter(node => node.nodeType === 8);

    expect(comments).to.have.length(1);
    expect(comments[0].textContent).to.contain('test-directive');
    sinon.assert.notCalled(callMe);
  });

  it('no class directive', () => {
    const $el = render(value => `
      <div class="test-directive">${escape(value)}</div>
    `);

    expect($el.find('.test-directive')).to.have.length(1);
    sinon.assert.notCalled(callMe);
  });

  it('no interpolation', () => {
    const $el = render(value => `
      <div class="foo {{callMe()}}">${escape(value)}</div>
    `);

    expect($el.find('.foo')).to.have.length(1);
    sinon.assert.notCalled(callMe);
  });
});
