import { uiRegistry } from 'ui/registry/_registry';

export const GettingStartedMonitorAndManageMessagesRegistryProvider = uiRegistry({
  name: 'gettingStartedMonitorAndManageMessages'
});

/**
 * Usage:
 *
 * import { GettingStartedMonitorAndManageMessagesRegistryProvider } from 'ui/getting_started/top_messages_registry';
 *
 * GettingStartedMonitorAndManageMessagesRegistryProvider.register(($injector, Private, someOtherService, ...) => ({
 *  template: 'plain text | html markup | markup with directives'
 * }));
 */
