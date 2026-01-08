/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs';

import {
  ControlGroupRenderer,
  type ControlGroupStateBuilder,
  type ControlGroupRendererApi,
} from '@kbn/control-group-renderer';
import type { TimeRange } from '@kbn/es-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { Timeslice } from '../../../common/descriptor_types';
import { getUiActions } from '../../kibana_services';

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
    const subscription = api.appliedTimeslice$
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
      <KibanaContextProvider services={{ uiActions: getUiActions() }}>
        <ControlGroupRenderer
          onApiAvailable={(nextApi: ControlGroupRendererApi) => {
            setApi(nextApi);
          }}
          dataLoading={dataLoading}
          getCreationOptions={async (initialState, builder: ControlGroupStateBuilder) => {
            builder.addTimeSliderControl(initialState);
            return {
              initialState,
            };
          }}
          timeRange={timeRange}
        />
      </KibanaContextProvider>
    </div>
  );
}
