/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { PROJECT_ROUTING, type ICPSManager } from '@kbn/cps-utils';

interface TransformLinkedProjectsState {
  error: unknown;
  hasLinkedProjects: boolean | undefined;
  isLoading: boolean;
}

const getInitialState = (cpsManager?: ICPSManager): TransformLinkedProjectsState => {
  if (!cpsManager) {
    return { error: undefined, hasLinkedProjects: false, isLoading: false };
  }

  if (cpsManager.hasLinkedProjects()) {
    return { error: undefined, hasLinkedProjects: true, isLoading: false };
  }

  return { error: undefined, hasLinkedProjects: undefined, isLoading: true };
};

export const useTransformHasLinkedProjects = (
  cpsManager?: ICPSManager
): TransformLinkedProjectsState => {
  const [state, setState] = useState<TransformLinkedProjectsState>(() =>
    getInitialState(cpsManager)
  );

  useEffect(() => {
    if (!cpsManager) {
      setState({ error: undefined, hasLinkedProjects: false, isLoading: false });
      return;
    }

    if (cpsManager.hasLinkedProjects()) {
      setState({ error: undefined, hasLinkedProjects: true, isLoading: false });
      return;
    }

    let isMounted = true;
    setState({ error: undefined, hasLinkedProjects: undefined, isLoading: true });

    cpsManager
      .fetchProjects(PROJECT_ROUTING.ALL)
      .then((projects) => {
        if (!isMounted) {
          return;
        }

        setState({
          error: undefined,
          hasLinkedProjects: Boolean(projects?.linkedProjects.length),
          isLoading: false,
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setState({ error, hasLinkedProjects: undefined, isLoading: false });
      });

    return () => {
      isMounted = false;
    };
  }, [cpsManager]);

  return state;
};
