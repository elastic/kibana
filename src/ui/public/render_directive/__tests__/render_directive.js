const angular = require('angular');
const sinon = require('sinon');
const expect = require('expect.js');
const ngMock = require('ngMock');

require('ui/render_directive');

let $parentScope;
let $elem;
let $directiveScope;

function init(markup = '', definition = {}) {
  ngMock.module('kibana/render_directive');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {
    $parentScope = $rootScope;

    // create the markup
    $elem = angular.element('<render-directive>');
    $elem.html(markup);
    if (definition !== false) {
      $parentScope.definition = definition;
      $elem.attr('definition', 'definition');
    }

    // compile the directive
    $compile($elem)($parentScope);
    $parentScope.$apply();

    $directiveScope = $elem.isolateScope();
  });
}

describe('render_directive', function () {
  describe('directive requirements', function () {
    it('should throw if not given a definition', function () {
      expect(() => init('', false)).to.throwException(/must have a definition/);
    });
  });

  describe('rendering with definition', function () {
    it('should call link method', function () {
      const markup = '<p>hello world</p>';
      const definition = {
        link: sinon.stub(),
      };

      init(markup, definition);

      expect(definition.link.callCount).to.equal(1);
    });

    it('should call controller method', function () {
      const markup = '<p>hello world</p>';
      const definition = {
        controller: sinon.stub(),
      };

      init(markup, definition);

      expect(definition.controller.callCount).to.equal(1);
    });
  });
});
