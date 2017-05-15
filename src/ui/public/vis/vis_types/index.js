import { AngularVisTypeFactoryProvider } from './angular_vis_type';
import { MapsVisTypeFactoryProvider } from './maps_vis_type';
import { VislibVisTypeFactoryProvider } from './vislib_vis_type';

export function VisTypesProvider(Private) {
  const AngularVisTypeFactory = Private(AngularVisTypeFactoryProvider);
  const MapsVisTypeFactory = Private(MapsVisTypeFactoryProvider);
  const VislibVisTypeFactory = Private(VislibVisTypeFactoryProvider);

  return {
    Angular: AngularVisTypeFactory,
    Maps: MapsVisTypeFactory,
    Vislib: VislibVisTypeFactory
  };
}
