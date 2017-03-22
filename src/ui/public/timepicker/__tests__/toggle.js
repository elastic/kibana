import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';

describe('kbnGlobalTimepicker', function () {
  let compile;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(($compile, $rootScope) => {
      compile = () => {
        const $el = $('<kbn-global-timepicker></kbn-global-timepicker>');
        $el.data('$kbnTopNavController', {}); // Mock the kbnTopNav
        $rootScope.$apply();
        $compile($el)($rootScope);
        return $el;
      };
    });
  });
  it('injects the timepicker into the DOM', () => {
    const $el = compile();
    expect($el.attr('data-test-subj')).to.be('globalTimepicker');
  });
});
