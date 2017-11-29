/**
 * @name stateManagementConfig
 *
 * @description Allows apps to configure state management
 */

import { uiModules } from 'ui/modules';

uiModules.get('kibana/state_management')
  .provider('stateManagementConfig', class StateManagementConfigProvider {
    enabled = true

    $get(/* inject stuff */) {
      return {
        enabled: this.enabled,
      };
    }

    disable() {
      this.enabled = false;
    }

    enable() {
      this.enabled = true;
    }
  });
