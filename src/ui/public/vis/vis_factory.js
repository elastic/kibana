import { VisTypeProvider, AngularVisTypeProvider, VislibVisTypeProvider } from './vis_types';

export const VisFactoryProvider = (Private) => {
  const VisType = Private(VisTypeProvider);
  const AngularVisType = Private(AngularVisTypeProvider);
  const VislibVisType = Private(VislibVisTypeProvider);

  return {
    createBaseVisualization: (config) => {
      return new VisType(config);
    },
    createAngularVisualization: (config) => {
      return new AngularVisType(config);
    },
    createVislibVisualization: (config) => {
      return new VislibVisType(config);
    }
  };
};
