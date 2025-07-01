/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { SOLUTION_VIEW_CLASSIC } from '@kbn/spaces-plugin/common/constants';
import { useKibana } from '../../common/lib/kibana';

export const useActiveSolution = () => {
  const { spaces } = useKibana().services;
  const defaultSolution = spaces?.getActiveSpace ? undefined : SOLUTION_VIEW_CLASSIC;
  const [activeSolution, setActiveSolution] = useState<string | undefined>(defaultSolution);

  useEffect(() => {
    let isMounted = true;
    const fetchActiveSpace = async () => {
      if (spaces?.getActiveSpace) {
        try {
          const space = await spaces.getActiveSpace();
          if (isMounted) setActiveSolution(space?.solution);
        } catch (e) {
          if (isMounted) setActiveSolution(undefined);
        }
      }
    };
    fetchActiveSpace();
    return () => {
      isMounted = false;
    };
  }, [spaces]);

  // Get current solution from the active space
  return activeSolution;
};
