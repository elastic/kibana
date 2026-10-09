/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

/**
 * `true` when cross-project search is live and this deployment has at least one linked project.
 * Gates copy that discloses knowledge indicator generation's cross-project scope - that
 * disclosure is only meaningful once there is more than one project to talk about.
 *
 * `hasLinkedProjects()` reflects data fetched during `whenReady()`, so this hook awaits
 * that before reading and stores the result so the caller re-renders once CPS is ready.
 */
export const useIsCpsMultiProject = (): boolean => {
  const {
    dependencies: {
      start: { cps },
    },
  } = useKibana();

  const cpsManager = cps?.cpsManager;
  const [isCpsMultiProject, setIsCpsMultiProject] = useState(false);

  useEffect(() => {
    if (!cpsManager) {
      return;
    }

    let isMounted = true;

    const resolveLinkedProjects = async () => {
      try {
        await cpsManager.whenReady();
        if (isMounted) {
          setIsCpsMultiProject(cpsManager.hasLinkedProjects());
        }
      } catch {
        if (isMounted) {
          setIsCpsMultiProject(false);
        }
      }
    };

    resolveLinkedProjects();

    return () => {
      isMounted = false;
    };
  }, [cpsManager]);

  return isCpsMultiProject;
};
