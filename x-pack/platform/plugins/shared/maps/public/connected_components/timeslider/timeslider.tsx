/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Observable, switchMap, tap } from 'rxjs';

import {
  ControlGroupRenderer,
  ControlGroupRendererApi,
  type ControlGroupRuntimeState,
  type ControlGroupStateBuilder,
} from '@kbn/controls-plugin/public';
import type { TimeRange } from '@kbn/es-query';

import { Timeslice } from '../../../common/descriptor_types';

export interface Props {
  setTimeslice: (timeslice?: Timeslice) => void;
  timeRange: TimeRange;
  waitForTimesliceToLoad$: Observable<void>;
}

export function Timeslider({ setTimeslice, timeRange, waitForTimesliceToLoad$ }: Props) {
  const [dataLoading, setDataLoading] = useState(false);
  const [api, setApi] = useState<ControlGroupRendererApi | undefined>();

  useEffect(() => {
    if (!api) {
      return;
    }

    let canceled = false;
    const subscription = api.timeslice$
      .pipe(
        tap(() => {
          if (!canceled) setDataLoading(true);
        }),
        switchMap((timeslice) => {
          setTimeslice(
            timeslice === undefined
              ? undefined
              : {
                  from: timeslice[0],
                  to: timeslice[1],
                }
          );
          return waitForTimesliceToLoad$;
        })
      )
      .subscribe(() => {
        if (!canceled) setDataLoading(false);
      });

    return () => {
      subscription?.unsubscribe();
      canceled = true;
    };
  }, [api, setTimeslice, waitForTimesliceToLoad$]);

  return (
    <div className="mapTimeslider mapTimeslider--animation">
      <ControlGroupRenderer
        onApiAvailable={(nextApi: ControlGroupRendererApi) => {
          setApi(nextApi);
        }}
        dataLoading={dataLoading}
        getCreationOptions={async (
          initialState: Partial<ControlGroupRuntimeState>,
          builder: ControlGroupStateBuilder
        ) => {
          builder.addTimeSliderControl(initialState);
          return {
            initialState,
          };
        }}
        timeRange={timeRange}
      />
    </div>
  );
}
