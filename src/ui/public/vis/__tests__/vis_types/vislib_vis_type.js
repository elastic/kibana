import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VislibVisTypeProvider } from '../../vis_types/vislib_vis_type';

describe('Vislib Vis Type', function () {
  let VislibVisType;

  const visConfig = {
    name: 'test',
    title: 'test',
    description: 'test',
    icon: 'test',
    visConfig: { component: 'test' },
    type: { visConfig: { component: 'test' } }
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    VislibVisType = Private(VislibVisTypeProvider);
  }));

  describe('initialization', () => {
    it('should set the basic response handler if not set', () => {
      const visType = new VislibVisType(visConfig);
      expect(visType.responseHandler).to.equal('basic');
    });

    it('should not change response handler if its already set', () => {
      visConfig.responseHandler = 'none';
      const visType = new VislibVisType(visConfig);
      expect(visType.responseHandler).to.equal('none');
    });

    it('creates vislib controller', () => {
      visConfig.responseHandler = 'none';
      const visType = new VislibVisType(visConfig);
      expect(visType.visualization).to.not.be.undefined;
    });
  });

  describe('controller', function () {
    it('constructor sets vis and element properties', () => {
      visConfig.responseHandler = 'none';
      const visType = new VislibVisType(visConfig);
      const Vis = visType.visualization;
      const vis = new Vis(window.document.body, {});
      expect(vis.el).to.not.be.undefined;
      expect(vis.vis).to.not.be.undefined;
    });
  });

  describe('render method', () => {
    let vis;
    beforeEach(() => {
      visConfig.responseHandler = 'none';
      const visType = new VislibVisType(visConfig);
      const Vis = visType.visualization;
      vis = new Vis(window.document.body, { params: {} });
    });

    it('rejects if response is not provided', () => {
      vis.render().then(() => {
        expect('promise was not rejected').to.equal(false);
      }).catch(() => {});
    });

    it('creates new vislib vis', () => {
      vis.render({});
      expect(vis.vis.vislibVis).to.not.be.undefined;
    });

  });

  describe('destroy method', () => {
    let vis;
    beforeEach(() => {
      visConfig.responseHandler = 'none';
      const visType = new VislibVisType(visConfig);
      const Vis = visType.visualization;
      vis = new Vis(window.document.body, { params: {} });
    });

    it('destroys vislib vis', () => {
      vis.render({}).then(() => {
        vis.destroy();
        expect(vis.vis.vislibVis).to.be.undefined;
      });
    });
  });
});
