import { AngularVisTypeFactoryProvider } from './angular_vis_type';
import { VislibVisTypeFactoryProvider } from './vislib_vis_type';

export function VisTypesProvider(Private) {
  const AngularVisTypeFactory = Private(AngularVisTypeFactoryProvider);
  const VislibVisTypeFactory = Private(VislibVisTypeFactoryProvider);

  return {
    Angular: AngularVisTypeFactory,
    Vislib: VislibVisTypeFactory
  };
}
