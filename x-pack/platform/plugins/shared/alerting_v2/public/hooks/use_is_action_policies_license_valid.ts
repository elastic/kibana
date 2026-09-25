/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { isActionPoliciesLicenseValid } from '../../common/action_policies_license';

/**
 * Whether the current license allows creating, updating, and enabling action policies.
 * Returns `true` until the license is known so the UI does not flash a disabled state;
 * the server enforces the check regardless.
 */
export const useIsActionPoliciesLicenseValid = (): boolean => {
  const { license$ } = useService<LicensingPluginStart>(PluginStart('licensing'));
  const isValid$ = useMemo(
    () => license$.pipe(map(isActionPoliciesLicenseValid), distinctUntilChanged()),
    [license$]
  );

  return useObservable(isValid$, true);
};
