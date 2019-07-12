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
import { BehaviorSubject, Subject } from 'rxjs';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

// The observable we want to trigger on a globalState save.
const globalStateSave$ = new Subject();

module
  .directive('mlJobSelectorReactWrapper', function (mlGlobalState, config, mlJobSelectService) {
    function link(scope, element, attrs) {
      const { jobIds, selectedGroups } = getSelectedJobIds(mlGlobalState);

      const props = {
        config,
        globalState: mlGlobalState,
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
  .service('mlGlobalState', function (globalState) {
    // This Proxy augments the original globlaState save function and triggers the observable.
    return new Proxy(
      globalState,
      {
        get(target, propKey) {
          if (propKey !== 'save') {
            return target[propKey];
          }
          return function (...args) {
            const result = target[propKey].apply(this, args);
            globalStateSave$.next();
            return result;
          };
        }
      }
    );
  })
  .service('mlJobSelectService', function (mlGlobalState) {
    const { jobIds, selectedGroups } = getSelectedJobIds(mlGlobalState);
    const mlJobSelectService = new BehaviorSubject({ selection: jobIds, groups: selectedGroups, resetSelection: false });

    // Subscribe to changes to globalState and trigger a mlJobSelectService if the job selection changed.
    globalStateSave$.subscribe(() => {
      const { newJobIds, newSelectedGroups } = getSelectedJobIds(mlGlobalState);
      const oldSelectedJobIds = mlJobSelectService.getValue().selection;

      if (newJobIds && !(_.isEqual(oldSelectedJobIds, newJobIds))) {
        mlJobSelectService.next({ selection: newJobIds, groups: newSelectedGroups });
      }
    });

    return mlJobSelectService;
  });
