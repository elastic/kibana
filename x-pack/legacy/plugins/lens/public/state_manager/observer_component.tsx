/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useEffect, useState, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { Pipable } from './state_manager';

type PropsMapper<TProps, TMappedProps> = (props$: Pipable<TProps>) => Pipable<TMappedProps>;

export function observerComponent<TProps, TMappedProps>(
  observable: Pipable<TMappedProps> | PropsMapper<TProps, TMappedProps>,
  Component:
    | React.FunctionComponent<TProps & TMappedProps>
    | React.ComponentClass<TProps & TMappedProps>
) {
  function ObserverComponent(props: TProps) {
    const [state, setState] = useState<TMappedProps | undefined>(undefined);
    const props$ = useMemo(() => new BehaviorSubject<TProps | undefined>(undefined), []);
    props$.next(props);

    useEffect(() => {
      const mapper: PropsMapper<TProps, TMappedProps> =
        typeof observable === 'function'
          ? (observable as PropsMapper<TProps, TMappedProps>)
          : () => observable as Pipable<TMappedProps>;

      // props$ will always have a value here, due to line `props$.next(props);` above
      const subscription = mapper((props$ as unknown) as Pipable<TProps>)
        .pipe(distinctUntilChanged(_.isEqual))
        .subscribe(setState);

      return () => subscription.unsubscribe();
    }, [props$]);

    return state ? <Component {...props} {...state} /> : null;
  }

  return ObserverComponent;
}
