import moment from 'moment';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import sinon from 'sinon';

describe('kbnGlobalTimepicker', function () {
  const sandbox = sinon.sandbox.create();

  let compile;
  let scope;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(($compile, $rootScope, timefilter) => {
      scope = $rootScope.$new();
      compile = (timefilterStubProperties = {}) => {
        Object.keys(timefilterStubProperties).forEach((key) => {
          sandbox.stub(timefilter, key, timefilterStubProperties[key]);
        });

        const $el = $('<kbn-global-timepicker></kbn-global-timepicker>');
        $el.data('$kbnTopNavController', {}); // Mock the kbnTopNav
        $compile($el)(scope);
        scope.$apply();
        return $el;
      };
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('injects the timepicker into the DOM', () => {
    const $el = compile();
    expect($el.attr('data-test-subj')).to.be('globalTimepicker');
  });

  it('sets data-shared-timefilter-* using the timefilter when auto-refresh selector is enabled', function () {
    const minString = '2000-01-01T00:00:00Z';
    const maxString = '2001-01-01T00:00:00Z';
    const bounds = {
      min: moment(minString),
      max: moment(maxString),
    };
    const timefilter = {
      isAutoRefreshSelectorEnabled: true,
      isTimeRangeSelectorEnabled: false,
      getBounds: () => bounds
    };

    const $el = compile(timefilter);

    expect($el.attr('data-shared-timefilter-from')).to.eql(minString);
    expect($el.attr('data-shared-timefilter-to')).to.eql(maxString);
  });

  it('sets data-shared-timefilter-* using the timefilter when time range selector is enabled', function () {
    const minString = '2000-01-01T00:00:00Z';
    const maxString = '2001-01-01T00:00:00Z';
    const bounds = {
      min: moment(minString),
      max: moment(maxString),
    };
    const timefilter = {
      isAutoRefreshSelectorEnabled: false,
      isTimeRangeSelectorEnabled: true,
      getBounds: () => bounds
    };

    const $el = compile(timefilter);

    expect($el.attr('data-shared-timefilter-from')).to.eql(minString);
    expect($el.attr('data-shared-timefilter-to')).to.eql(maxString);
  });

  it(`doesn't set data-shared-timefilter-* when auto-refresh and time range selectors are both disabled`, function () {
    const minString = '2000-01-01T00:00:00Z';
    const maxString = '2001-01-01T00:00:00Z';
    const bounds = {
      min: moment(minString),
      max: moment(maxString),
    };
    const timefilter = {
      isAutoRefreshSelectorEnabled: false,
      isTimeRangeSelectorEnabled: false,
      getBounds: () => bounds
    };

    const $el = compile(timefilter);

    expect($el.attr('data-shared-timefilter-from')).to.eql('');
    expect($el.attr('data-shared-timefilter-to')).to.eql('');
  });
});
