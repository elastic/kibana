import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';

describe('kbnGlobalTimepicker', function () {
  let compile;
  let scope;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(($compile, $rootScope) => {
      scope = $rootScope.$new();
      compile = () => {
        const $el = $('<kbn-global-timepicker></kbn-global-timepicker>');
        $el.data('$kbnTopNavController', {}); // Mock the kbnTopNav
        $compile($el)(scope);
        scope.$apply();
        return $el;
      };
    });
  });
  it('injects the timepicker into the DOM', () => {
    const $el = compile();
    expect($el.attr('data-test-subj')).to.be('globalTimepicker');
  });
  it('sets data-shared-timefilter to false when timefilter.enabled is false', function () {
    scope.timefilter = {
      enabled: false
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('false');
  });
  it('sets data-shared-timefilter to true when timefilter.enabled is true', function () {
    scope.timefilter = {
      enabled: true
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('true');
  });
});
