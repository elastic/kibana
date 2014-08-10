define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  angular.module('AppendElemUtilService', ['kibana']);

  describe('Vislib d3 Function Test Suite', function () {

    describe('Test Append Function', function () {
      var appendElem;
      var fixture;
      var fixture1;

      beforeEach(function () {
        module('AppendElemUtilService');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          appendElem = Private(require('components/vislib/utils/d3/_append_elem'));
          fixture = appendElem('body', 'div', 'test');
          fixture1 = appendElem('body', 'div');
        });
      });

      afterEach(function () {
        fixture.remove();
        fixture1.remove();
      });

      it(' should return a function', function () {
        expect(_.isFunction(appendElem)).to.be(true);
      });

      it(' should rappend a div to the body', function () {
        expect(fixture).to.have.length(1);
      });

      it(' should have the correct class name', function () {
        expect(fixture.attr('class')).to.be('test');
      });

      it(' should have the correct class name if class name not provided', function () {
        expect(fixture1.attr('class')).to.be('div');
      });

    });
  });
});
