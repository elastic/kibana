import ngMock from 'ngMock';
import expect from 'expect.js';
import uiModules from 'ui/modules';

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
      }
    });
  });
  it('injects the timepicker into the DOM', () => {
    const $el = compile();
    expect($el.find('ul.navbar-timepicker')).to.have.length(1);
  });
});
