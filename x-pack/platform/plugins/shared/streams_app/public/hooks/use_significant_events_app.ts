/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

/**
 * Returns the significantEventsApp optional plugin and a reactive `isAvailable`
 * boolean derived from its `availability$` observable. Components should gate
 * any sig-events UI behind `isAvailable` so it stays hidden in environments
 * where the plugin is absent or the feature-flag / license is off.
 *
 * `isLoading` is true until the first emission when the plugin is present —
 * use it before navigating away on the basis of `isAvailable`.
 */
export function useSignificantEventsApp() {
  const {
    dependencies: {
      start: { significantEventsApp },
    },
  } = useKibana();

  const availability = useObservable(significantEventsApp?.availability$ ?? EMPTY);

  return {
    significantEventsApp,
    isAvailable: availability ?? false,
    isLoading: significantEventsApp != null && availability === undefined,
  };
}
