import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisRenderbotProvider } from 'ui/vis/renderbot';

describe('renderbot', function () {
  let Renderbot;

  function init() {
    ngMock.module('kibana');

    ngMock.inject(function (Private) {
      Renderbot = Private(VisRenderbotProvider);
    });
  }

  describe('API', function () {
    let vis;
    let $el;
    let renderbot;
    let uiState;

    beforeEach(init);
    beforeEach(function () {
      vis = { hello: 'world' };
      $el = 'element';
      uiState = {};
      renderbot = new Renderbot(vis, $el, uiState);
    });

    it('should have expected methods', function () {
      expect(renderbot).to.have.property('render');
      expect(renderbot).to.have.property('destroy');
      expect(renderbot).to.have.property('updateParams');
    });

    it('should throw if not implemented', function () {
      expect(renderbot.render).to.throwError();
      expect(renderbot.destroy).to.throwError();
    });
  });
});
