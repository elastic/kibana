/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { CoreStart } from 'src/core/public';

let isActive = false;

export interface LoadingIndicatorInterface {
  show: () => void;
  hide: () => void;
}

const loadingCount$ = new Rx.BehaviorSubject(0);

export const initLoadingIndicator = (addLoadingCount: CoreStart['http']['addLoadingCountSource']) =>
  addLoadingCount(loadingCount$);

export const loadingIndicator = {
  show: () => {
    if (!isActive) {
      isActive = true;
      loadingCount$.next(1);
    }
  },
  hide: () => {
    if (isActive) {
      isActive = false;
      loadingCount$.next(0);
    }
  },
};
