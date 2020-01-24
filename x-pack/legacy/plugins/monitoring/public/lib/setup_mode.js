/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from './ajax_error_handler';
import { get, contains } from 'lodash';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';

import {
  checkInternalMonitoring,
  destroyInternalMonitoringWarning,
} from '../components/setup_mode/check_internal_monitoring';

const angularState = {
  injector: null,
  scope: null,
};

const isEligible = () => {
  if (!angularState.injector || !angularState.scope) {
    throw 'Unable to interact with setup mode because the angular injector was not previously set.' +
      ' This needs to be set by calling `initSetupModeState`.';
  }
  const { cloud } = npSetup.plugins;
  return !contains(window.location.hash, 'no-data') && !!(cloud && cloud.isCloudEnabled) === false;
};

const setupModeState = {
  enabled: false,
  data: null,
  oldData: null,
  callback: null,
};

export const isInSetupMode = () => Boolean(setupModeState.enabled);
export const getSetupModeState = () => setupModeState;

const setNewlyDiscoveredClusterUuid = clusterUuid => {
  const globalState = angularState.injector.get('globalState');
  const executor = angularState.injector.get('$executor');
  angularState.scope.$apply(() => {
    globalState.cluster_uuid = clusterUuid;
    globalState.save();
  });
  executor.run();
};

const fetchCollectionData = async (uuid, fetchWithoutClusterUuid = false) => {
  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;

  let url = '../api/monitoring/v1/setup/collection';
  if (uuid) {
    url += `/node/${uuid}`;
  } else if (!fetchWithoutClusterUuid && clusterUuid) {
    url += `/cluster/${clusterUuid}`;
  } else {
    url += '/cluster';
  }

  try {
    const response = await http.post(url, { ccs });
    return response.data;
  } catch (err) {
    const Private = angularState.injector.get('Private');
    const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
    return ajaxErrorHandlers(err);
  }
};

const changeSetupModeData = newData => {
  setupModeState.oldData = setupModeState.data;
  setupModeState.data = newData;
  setupModeState.callback && setupModeState.callback(newData);
};

export const updateSetupModeData = async (uuid, fetchWithoutClusterUuid = false) => {
  if (!isEligible()) {
    return Promise.resolve();
  }
  const data = await fetchCollectionData(uuid, fetchWithoutClusterUuid);
  const hasPermissions = get(data, '_meta.hasPermissions', false);

  if (!hasPermissions) {
    angularState.scope.$evalAsync(() => {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.setupMode.notAvailableTitle', {
          defaultMessage: 'Setup mode is not available',
        }),
        text: i18n.translate('xpack.monitoring.setupMode.notAvailablePermissions', {
          defaultMessage: 'You do not have the necessary permissions to do this.',
        }),
      });
    });
    changeSetupModeData(data);
    toggleSetupMode(false); // eslint-disable-line no-use-before-define
    return Promise.resolve();
  }

  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  if (!clusterUuid) {
    const liveClusterUuid = get(data, '_meta.liveClusterUuid');
    const migratedEsNodes = Object.values(get(data, 'elasticsearch.byUuid', {})).filter(
      node => node.isPartiallyMigrated || node.isFullyMigrated
    );
    if (liveClusterUuid && migratedEsNodes.length > 0) {
      setNewlyDiscoveredClusterUuid(liveClusterUuid);
    }
  }

  changeSetupModeData(data);
};

export const disableElasticsearchInternalCollection = async () => {
  if (!isEligible()) {
    return Promise.resolve();
  }

  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const url = `../api/monitoring/v1/setup/collection/${clusterUuid}/disable_internal_collection`;
  try {
    const response = await http.post(url);
    return response.data;
  } catch (err) {
    const Private = angularState.injector.get('Private');
    const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
    return ajaxErrorHandlers(err);
  }
};

export const toggleSetupMode = async inSetupMode => {
  if (!isEligible() || setupModeState.enabled === inSetupMode) {
    return;
  }

  setupModeState.enabled = inSetupMode;
  setSetupModeMenuItem(); // eslint-disable-line  no-use-before-define

  if (inSetupMode) {
    await updateSetupModeData();
  } else {
    // Needed for components that rely on repaint
    setupModeState.callback && setupModeState.callback();
  }
};

export const setSetupModeMenuItem = () => {
  if (!isEligible() || isInSetupMode()) {
    destroyInternalMonitoringWarning();
    return;
  }
  checkInternalMonitoring(angularState.injector, toggleSetupMode);
};

export const initSetupModeState = ($scope, $injector, callback) => {
  angularState.scope = $scope;
  angularState.injector = $injector;
  setupModeState.callback = callback;
  setupModeState.enabled && toggleSetupMode(true);
};
