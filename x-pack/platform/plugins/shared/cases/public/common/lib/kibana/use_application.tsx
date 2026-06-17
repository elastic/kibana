/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject, Observable } from 'rxjs';
import { useKibana } from './kibana_react';

interface UseApplicationReturn {
  appId: string | undefined;
  appTitle: string | undefined;
}

const isBehaviorSubjectObservable = <T,>(
  observable: Observable<T>
): observable is BehaviorSubject<T> => 'value' in observable;

/**
 * Checks if the observable is stateful and, in case, sets up `useObservable` with an initial value
 */
const useStatefulObservable = <T,>(observable: Observable<T>) => {
  let initialValue: T | undefined;

  if (isBehaviorSubjectObservable(observable)) {
    initialValue = observable.value;
  }

  return useObservable(observable, initialValue);
};

export const useApplication = (): UseApplicationReturn => {
  const { currentAppId$, applications$ } = useKibana().services.application;
  // retrieve the most recent value from the BehaviorSubject
  const appId = useStatefulObservable(currentAppId$);
  const applications = useStatefulObservable(applications$);

  const appTitle = appId
    ? applications?.get(appId)?.category?.label ?? applications?.get(appId)?.title
    : undefined;

  return { appId, appTitle };
};
