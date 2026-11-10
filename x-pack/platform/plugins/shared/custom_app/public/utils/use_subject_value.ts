/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { BehaviorSubject } from 'rxjs';

/**
 * The current value of a subject, for as long as it is that subject. Unlike
 * `useStateFromPublishingSubject`, which subscribes once and never follows a different subject, it
 * switches to a new one when it is given one. A page that shows an app builds a new data layer and
 * a new runtime whenever the app changes, and a component left listening to the old ones would
 * show what they last said: a table forever loading.
 */
export const useSubjectValue = <T>(subject: BehaviorSubject<T>): T => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const subscription = subject.subscribe(onChange);
      return () => subscription.unsubscribe();
    },
    [subject]
  );
  return useSyncExternalStore(subscribe, () => subject.getValue());
};
