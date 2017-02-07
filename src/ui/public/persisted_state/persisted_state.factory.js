/**
 * @name AngularPersistedState
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
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.factory('PersistedState', ($injector) => {
  const Private = $injector.get('Private');
  const Events = Private(EventsProvider);

  // Extend PersistedState to override the EmitterClass class with
  // our Angular friendly version.
  return class AngularPersistedState extends PersistedState {
    constructor(value, path, parent, silent) {
      super(value, path, parent, silent, Events);
    }
  };
});

