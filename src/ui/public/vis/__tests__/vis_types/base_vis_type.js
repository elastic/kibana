import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VisTypeProvider } from '../../vis_types/base_vis_type';

describe('Base Vis Type', function () {
  let BaseVisType;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    BaseVisType = Private(VisTypeProvider);
  }));

  describe('initialization', () => {
    it('should throw if mandatory properties are missing', () => {
      expect(() => {
        new BaseVisType({});
      }).to.throwError('vis_type must define its name');

      expect(() => {
        new BaseVisType({ name: 'test' });
      }).to.throwError('vis_type must define its title');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test' });
      }).to.throwError('vis_type must define its description');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test', description: 'test' });
      }).to.throwError('vis_type must define its icon or image');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test', description: 'test', icon: 'test' });
      }).to.throwError('vis_type must define visualization controller');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test', description: 'test', icon: 'test', visualization: {} });
      }).to.not.throwError();
    });
  });

});
