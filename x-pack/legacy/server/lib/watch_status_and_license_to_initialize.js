/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { catchError, mergeMap, map, switchMap, tap } from 'rxjs/operators';

export const RETRY_SCALE_DURATION = 100;
export const RETRY_DURATION_MAX = 10000;

const calculateDuration = (i) => {
  const duration = i * RETRY_SCALE_DURATION;
  if (duration > RETRY_DURATION_MAX) {
    return RETRY_DURATION_MAX;
  }

  return duration;
};

// we can't use a retryWhen here, because we want to propagate the red status and then retry
const propagateRedStatusAndScaleRetry = () => {
  let i = 0;
  return (err, caught) =>
    Rx.concat(
      Rx.of({
        state: 'red',
        message: err.message,
      }),
      Rx.timer(calculateDuration(++i)).pipe(mergeMap(() => caught))
    );
};

export function watchStatusAndLicenseToInitialize(xpackMainPlugin, downstreamPlugin, initialize) {
  const xpackInfo = xpackMainPlugin.info;
  const xpackInfoFeature = xpackInfo.feature(downstreamPlugin.id);

  const upstreamStatus = xpackMainPlugin.status;
  const currentStatus$ = Rx.of({
    state: upstreamStatus.state,
    message: upstreamStatus.message,
  });
  const newStatus$ = Rx.fromEvent(
    upstreamStatus,
    'change',
    null,
    (previousState, previousMsg, state, message) => {
      return {
        state,
        message,
      };
    }
  );
  const status$ = Rx.merge(currentStatus$, newStatus$);

  const currentLicense$ = Rx.of(xpackInfoFeature.getLicenseCheckResults());
  const newLicense$ = Rx.fromEventPattern(xpackInfo.onLicenseInfoChange.bind(xpackInfo)).pipe(
    map(() => xpackInfoFeature.getLicenseCheckResults())
  );
  const license$ = Rx.merge(currentLicense$, newLicense$);

  Rx.combineLatest(status$, license$)
    .pipe(
      map(([status, license]) => ({ status, license })),
      switchMap(({ status, license }) => {
        if (status.state !== 'green') {
          return Rx.of({ state: status.state, message: status.message });
        }

        return Rx.defer(() => initialize(license)).pipe(
          map(() => ({
            state: 'green',
            message: 'Ready',
          })),
          catchError(propagateRedStatusAndScaleRetry())
        );
      }),
      tap(({ state, message }) => {
        downstreamPlugin.status[state](message);
      })
    )
    .subscribe();
}
