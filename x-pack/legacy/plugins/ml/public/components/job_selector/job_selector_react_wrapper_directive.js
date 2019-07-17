/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Job Selector React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

import { JobSelector } from './job_selector';
import { getSelectedJobIds } from './job_select_service_utils';
import { BehaviorSubject } from 'rxjs';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .directive('mlJobSelectorReactWrapper', function (globalState, config, mlJobSelectService) {
    function link(scope, element, attrs) {
      const { jobIds, selectedGroups } = getSelectedJobIds(globalState);

      const props = {
        config,
        globalState,
        jobSelectService: mlJobSelectService,
        selectedJobIds: jobIds,
        selectedGroups,
        timeseriesOnly: attrs.timeseriesonly,
        singleSelection: attrs.singleselection
      };

      ReactDOM.render(React.createElement(JobSelector, props),
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    }

    return {
      scope: false,
      link,
    };
  })
  .service('mlJobSelectService', function (globalState) {
    const { jobIds, selectedGroups } = getSelectedJobIds(globalState);
    const mlJobSelectService = new BehaviorSubject({ selection: jobIds, groups: selectedGroups, resetSelection: false });

    // Subscribe to changes to globalState and trigger
    // a mlJobSelectService update if the job selection changed.
    globalState.on('save_with_changes', () => {
      const { newJobIds, newSelectedGroups } = getSelectedJobIds(globalState);
      const oldSelectedJobIds = mlJobSelectService.getValue().selection;

      if (newJobIds && !(_.isEqual(oldSelectedJobIds, newJobIds))) {
        mlJobSelectService.next({ selection: newJobIds, groups: newSelectedGroups });
      }
    });

    return mlJobSelectService;
  });
