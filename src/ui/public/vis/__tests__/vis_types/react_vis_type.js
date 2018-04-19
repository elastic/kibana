import ngMock from 'ng_mock';
import expect from 'expect.js';
import { ReactVisTypeProvider } from '../../vis_types/react_vis_type';

describe('React Vis Type', function () {
  let ReactVisType;

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
    ReactVisType = Private(ReactVisTypeProvider);
  }));

  describe('initialization', () => {
    it('should throw if component is not set', () => {
      expect(() => {
        new ReactVisType({});
      }).to.throwError();
    });

    it('creates react controller', () => {
      const visType = new ReactVisType(visConfig);
      expect(visType.visualization).to.not.be.an('undefined');
    });
  });

  describe('controller render method', () => {
    let vis;
    beforeEach(() => {
      const visType = new ReactVisType(visConfig);
      const Vis = visType.visualization;

      vis = new Vis(window.document.body, {});
    });

    it('rejects if data is not provided', () => {
      vis.render().then(() => {
        expect('promise was not rejected').to.equal(false);
      }).catch(() => {});
    });

    it('renders the component', () => {
      expect(() => {
        vis.render({});
      }).to.not.throwError();
    });

  });
});
