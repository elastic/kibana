/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Job Selector React component.
 */

import _ from 'lodash';

import { getSelectedJobIds } from './job_select_service_utils';
import { BehaviorSubject } from 'rxjs';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .service('mlJobSelectService', function (globalState) {
    const { jobIds, selectedGroups } = getSelectedJobIds(globalState);
    const mlJobSelectService = new BehaviorSubject({ selection: jobIds, groups: selectedGroups, resetSelection: false });

    // Subscribe to changes to globalState and trigger
    // a mlJobSelectService update if the job selection changed.
    globalState.on('save_with_changes', () => {
      const { jobIds: newJobIds, selectedGroups: newSelectedGroups } = getSelectedJobIds(globalState);
      const oldSelectedJobIds = mlJobSelectService.getValue().selection;

      if (newJobIds && !(_.isEqual(oldSelectedJobIds, newJobIds))) {
        mlJobSelectService.next({ selection: newJobIds, groups: newSelectedGroups });
      }
    });

    return mlJobSelectService;
  });
