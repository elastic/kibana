import { uiRegistry } from 'ui/registry/_registry';

export const NavBarExtensionsRegistryProvider = uiRegistry({
  name: 'navbarExtensions',
  index: ['name'],
  group: ['appName'],
  order: ['order']
});

