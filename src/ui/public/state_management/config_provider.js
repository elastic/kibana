/**
 * @name stateManagementConfig
 *
 * @description Allows apps to configure state management
 */

import { uiModules } from '../modules';

uiModules.get('kibana/state_management')
  .provider('stateManagementConfig', class StateManagementConfigProvider {
    _enabled = true

    $get(/* inject stuff */) {
      return {
        enabled: this._enabled,
      };
    }

    disable() {
      this._enabled = false;
    }

    enable() {
      this._enabled = true;
    }
  });
