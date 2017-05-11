import { uiRegistry } from 'ui/registry/_registry';

export const GettingStartedTopMessagesRegistryProvider = uiRegistry({
  name: 'gettingStartedTopMessages'
});

/**
 * Usage:
 *
 * import { GettingStartedTopMessagesRegistryProvider } from 'ui/getting_started/top_messages_registry';
 *
 * GettingStartedTopMessagesRegistryProvider.register(($injector, Private, someOtherService, ...) => ({
 *  template: 'plain text | html markup | markup with directives'
 * }));
 */
