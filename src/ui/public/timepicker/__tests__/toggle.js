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

  it('sets data-shared-timefilter to true when timefilter.isAutoRefreshEnabled is true', function () {
    scope.timefilter = {
      isAutoRefreshEnabled: true,
      isTimeRangeEnabled: false
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('true');
  });
  it('sets data-shared-timefilter to true when timefilter.isTimeRangeEnabled is true', function () {
    scope.timefilter = {
      isAutoRefreshEnabled: false,
      isTimeRangeEnabled: true
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('true');
  });
  it('sets data-shared-timefilter to false when timefilter.isAutoRefreshEnabled and timefilter.isTimeRangeEnabled are false', function () {
    scope.timefilter = {
      isAutoRefreshEnabled: false,
      isTimeRangeEnabled: false
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('false');
  });
});
