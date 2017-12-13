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

  it('sets data-shared-timefilter to true when auto-refresh selector is enabled', function () {
    scope.timefilter = {
      isAutoRefreshSelectorEnabled: true,
      isTimeRangeSelectorEnabled: false
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('true');
  });
  it('sets data-shared-timefilter to true when time range selector is enabled', function () {
    scope.timefilter = {
      isAutoRefreshSelectorEnabled: false,
      isTimeRangeSelectorEnabled: true
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('true');
  });
  it(`sets data-shared-timefilter to false when auto-refresh and time range selectors are both disabled`, function () {
    scope.timefilter = {
      isAutoRefreshSelectorEnabled: false,
      isTimeRangeSelectorEnabled: false
    };
    const $el = compile();
    expect($el.attr('data-shared-timefilter')).to.eql('false');
  });
});
