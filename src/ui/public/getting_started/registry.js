import { uiRegistry } from 'ui/registry/_registry';

export const GettingStartedRegistryProvider = uiRegistry({
  name: 'gettingStartedTopMessages',
  group: [ 'type' ]
});

/**
 * Usage:
 *
 * import { GettingStartedRegistryProvider } from 'ui/getting_started/registry';
 * import { GETTING_STARTED_REGISTRY_TYPES } from 'ui/getting_started/constants';
 *
 * GettingStartedRegistryProvider.register(($injector, Private, someOtherService, ...) => ({
 *  type: GETTING_STARTED_REGISTRY_TYPES.TOP_MESSAGE,
 *  template: 'plain text | html markup | markup with directives'
 * }));
 */
