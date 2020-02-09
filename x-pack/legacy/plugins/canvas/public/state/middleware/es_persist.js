/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { ErrorStrings } from '../../../i18n';
import { getWorkpad, getFullWorkpadPersisted, getWorkpadPersisted } from '../selectors/workpad';
import { getAssetIds } from '../selectors/assets';
import { appReady } from '../actions/app';
import { setWorkpad, setRefreshInterval, resetWorkpad } from '../actions/workpad';
import { setAssets, resetAssets } from '../actions/assets';
import * as transientActions from '../actions/transient';
import * as resolvedArgsActions from '../actions/resolved_args';
import { update, updateAssets, updateWorkpad } from '../../lib/workpad_service';
import { notify } from '../../lib/notify';
import { canUserWrite } from '../selectors/app';

const { esPersist: strings } = ErrorStrings;

const workpadChanged = (before, after) => {
  const workpad = getWorkpad(before);
  return getWorkpad(after) !== workpad;
};

const assetsChanged = (before, after) => {
  const assets = getAssetIds(before);
  return !isEqual(assets, getAssetIds(after));
};

export const esPersistMiddleware = ({ getState }) => {
  // these are the actions we don't want to trigger a persist call
  const skippedActions = [
    appReady, // there's no need to resave the workpad once we've loaded it.
    resetWorkpad, // used for resetting the workpad in state
    setWorkpad, // used for loading and creating workpads
    setAssets, // used when loading assets
    resetAssets, // used when creating new workpads
    setRefreshInterval, // used to set refresh time interval which is a transient value
    ...Object.values(resolvedArgsActions), // no resolved args affect persisted values
    ...Object.values(transientActions), // no transient actions cause persisted state changes
  ].map(a => a.toString());

  return next => action => {
    // if the action is in the skipped list, do not persist
    if (skippedActions.indexOf(action.type) >= 0) {
      return next(action);
    }

    // capture state before and after the action
    const curState = getState();
    next(action);
    const newState = getState();

    // skips the update request if user doesn't have write permissions
    if (!canUserWrite(newState)) {
      return;
    }

    const notifyError = err => {
      const statusCode = err.response && err.response.status;
      switch (statusCode) {
        case 400:
          return notify.error(err.response, {
            title: strings.getSaveFailureTitle(),
          });
        case 413:
          return notify.error(strings.getTooLargeErrorMessage(), {
            title: strings.getSaveFailureTitle(),
          });
        default:
          return notify.error(err, {
            title: strings.getUpdateFailureTitle(),
          });
      }
    };

    const changedWorkpad = workpadChanged(curState, newState);
    const changedAssets = assetsChanged(curState, newState);

    if (changedWorkpad && changedAssets) {
      // if both the workpad and the assets changed, save it in its entirety to elasticsearch
      const persistedWorkpad = getFullWorkpadPersisted(getState());
      return update(persistedWorkpad.id, persistedWorkpad).catch(notifyError);
    } else if (changedWorkpad) {
      // if the workpad changed, save it to elasticsearch
      const persistedWorkpad = getWorkpadPersisted(getState());
      return updateWorkpad(persistedWorkpad.id, persistedWorkpad).catch(notifyError);
    } else if (changedAssets) {
      // if the assets changed, save it to elasticsearch
      const persistedWorkpad = getFullWorkpadPersisted(getState());
      return updateAssets(persistedWorkpad.id, persistedWorkpad.assets).catch(notifyError);
    }
  };
};
