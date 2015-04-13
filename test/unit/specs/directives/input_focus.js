define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  require('directives/input_focus');

  describe('Input focus directive', function () {
    var $compile, $rootScope, $timeout, element;
    var $el, selectedEl, selectedText;
    var inputValue = 'Input Text Value';

    beforeEach(module('kibana'));

    beforeEach(inject(function (_$compile_, _$rootScope_, _$timeout_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;

      $el = $('<div>');
      $el.appendTo('body');
    }));

    afterEach(function () {
      $el.remove();
      $el = null;
    });

    function renderEl(html) {
      $rootScope.value = inputValue;
      element = $compile(html)($rootScope);
      element.appendTo($el);
      $rootScope.$digest();
      $timeout.flush();
      selectedEl = document.activeElement;
      selectedText = window.getSelection().toString();
    }


    it('should focus the input', function () {
      renderEl('<input type="text" ng-model="value" input-focus />');
      expect(selectedEl).to.equal(element[0]);
      expect(selectedText.length).to.equal(0);
    });

    it('should select the text in the input', function () {
      renderEl('<input type="text" ng-model="value" input-focus="select" />');
      expect(selectedEl).to.equal(element[0]);
      expect(selectedText.length).to.equal(inputValue.length);
      expect(selectedText).to.equal(inputValue);
    });
  });
});