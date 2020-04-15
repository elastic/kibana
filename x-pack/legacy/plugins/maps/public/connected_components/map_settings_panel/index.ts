/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FLYOUT_STATE } from '../../../../../../plugins/maps/public/reducers/ui';
import { MapSettingsPanel } from './map_settings_panel';
import { rollbackMapSettings, updateMapSetting } from '../../actions/map_actions';
import { getMapSettings } from '../../selectors/map_selectors';
import { updateFlyout } from '../../actions/ui_actions';

function mapStateToProps(state = {}) {
  return {
    mapSettings: getMapSettings(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    cancelChanges: () => {
      dispatch(rollbackMapSettings());
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
    },
    keepChanges: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
    },
    updateMapSetting: (settingKey, settingValue) => {
      dispatch(updateMapSetting(settingKey, settingValue));
    },
  };
}

const connectedMapSettingsPanel = connect(mapStateToProps, mapDispatchToProps)(MapSettingsPanel);
export { connectedMapSettingsPanel as MapSettingsPanel };
