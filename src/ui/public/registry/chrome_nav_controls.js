import { uiRegistry } from 'ui/registry/_registry';

export const chromeNavControlsRegistry = uiRegistry({
  name: 'chromeNavControls',
  order: ['order']
});

// Used in x-pack. TODO: use named version and remove.
export default chromeNavControlsRegistry;
