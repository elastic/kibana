import { uiRegistry } from 'ui/registry/_registry';

export const NavBarExtensionsRegistryProvider = uiRegistry({
  name: 'navbarExtensions',
  index: ['name'],
  group: ['appName'],
  order: ['order']
});

// Used in x-pack. TODO: switch to named and remove;
export default NavBarExtensionsRegistryProvider;
