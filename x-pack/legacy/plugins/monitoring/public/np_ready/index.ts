import { PluginInitializerContext } from 'src/core/public';
import { MonitoringPlugin } from './plugin';

export function plugin(ctx: PluginInitializerContext) {
  return new MonitoringPlugin(ctx);
}