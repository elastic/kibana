/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import { useRouteMatch } from 'react-router-dom';
import { useKibana } from '../../common/lib';

/**
 * Returns a function to dynamically set the CPS global project picker
 * access state only for the current matching route
 */
export const useRegisterCpsPickerAccess = () => {
  const { application, cps } = useKibana().services;
  const routeMatch = useRouteMatch();
  const currentAppId = useObservable(application.currentAppId$);
  const [access, setAccess] = useState(ProjectRoutingAccess.DISABLED);

  useEffect(() => {
    if (!currentAppId || !cps?.cpsManager) {
      return;
    }
    cps.cpsManager.registerAppAccess(currentAppId, (location) => {
      if (location.endsWith(routeMatch.url)) {
        return access;
      }
      return ProjectRoutingAccess.DISABLED;
    });

    return () => {
      cps?.cpsManager?.registerAppAccess(currentAppId, () => ProjectRoutingAccess.DISABLED);
    };
  }, [access, cps, currentAppId, routeMatch]);

  return setAccess;
};
