import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

export interface ChatDataRegistryPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChatDataRegistryPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
