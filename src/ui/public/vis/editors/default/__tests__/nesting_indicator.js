import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('nestingIndicator directive', () => {
  let element;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((_$rootScope_, _$compile_) => {
    $rootScope = _$rootScope_;

    $rootScope.list = ['test'];
    $rootScope.item = 'test';
    element = _$compile_('<nesting-indicator item="item" list="list">')($rootScope);
  }));

  it('should update background color on list change', () => {
    $rootScope.list.push('test2');
    $rootScope.$digest();
    expect(element.find('span').length).to.equal(1);
  });

});
