import expect from 'expect.js';
import ngMock from 'ng_mock';
import uiModules from 'ui/modules';
import $ from 'jquery';

describe('kbnGlobalTimepicker', function () {
  let compile;
  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(($compile, $rootScope) => {
      compile = () => {
        const $el = $('<kbn-global-timepicker></kbn-global-timepicker>');
        $rootScope.$apply();
        $compile($el)($rootScope);
        return $el;
      };
    });
  });
  it('injects the timepicker into the DOM', () => {
    const $el = compile();
    expect($el.find('button[ng-click]')).to.have.length(3);
  });
});
