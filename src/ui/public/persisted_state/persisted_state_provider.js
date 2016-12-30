/**
 * @name PersistedStateProvider
 *
 * Returns a PersistedState object which uses an EventEmitter instead of
 * the SimpleEmitter. The EventEmitter adds digest loops every time a handler is called
 * so it's preferable to use this variation when a callback modifies angular UI.
 *
 * TODO: The handlers themselves should really be responsible for triggering digest loops
 * as opposed to having an all or nothing situation. A nice goal would be to get rid
 * of the EventEmitter entirely and require handlers that need it to trigger a digest loop
 * themselves. We can even supply a service to wrap the callbacks in a function that
 * would call the callback, and finish with a $rootScope.$apply().
 */

import EventsProvider from 'ui/events';
import { PersistedState } from './persisted_state';

export function PersistedStateProvider(Private) {
  const Events = Private(EventsProvider);

  return (value, path, parent, silent) => new PersistedState(value, path, parent, silent, Events);
}

