import { VisTypeProvider, AngularVisTypeProvider, ReactVisTypeProvider, VislibVisTypeProvider } from './vis_types';

export const VisFactoryProvider = (Private) => {
  const VisType = Private(VisTypeProvider);
  const AngularVisType = Private(AngularVisTypeProvider);
  const ReactVisType = Private(ReactVisTypeProvider);
  const VislibVisType = Private(VislibVisTypeProvider);

  return {
    createBaseVisualization: (config) => {
      return new VisType(config);
    },
    createAngularVisualization: (config) => {
      return new AngularVisType(config);
    },
    createReactVisualization: (config) => {
      return new ReactVisType(config);
    },
    createVislibVisualization: (config) => {
      return new VislibVisType(config);
    }
  };
};
