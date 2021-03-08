import { ReportingExamplePlugin } from './plugin';

export function plugin() {
  return new ReportingExamplePlugin();
}
export { PluginSetup, PluginStart } from './types';
