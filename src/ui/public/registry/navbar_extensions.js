import { uiRegistry } from './_registry';

export const NavBarExtensionsRegistryProvider = uiRegistry({
  name: 'navbarExtensions',
  index: ['name'],
  group: ['appName'],
  order: ['order']
});

