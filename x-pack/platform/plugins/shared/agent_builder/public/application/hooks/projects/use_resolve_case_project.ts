/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ProjectsService } from '../../../services/projects';

export interface UseResolveCaseProjectOptions {
  projectsService: ProjectsService;
  caseId?: string;
  caseOwner?: string;
  projectId?: string;
  caseTitle?: string;
}

/**
 * Resolves (get-or-create) a case-typed project when chat is opened with case context.
 */
export const useResolveCaseProject = ({
  projectsService,
  caseId,
  caseOwner,
  projectId: projectIdProp,
  caseTitle,
}: UseResolveCaseProjectOptions): string | undefined => {
  const [resolvedProjectId, setResolvedProjectId] = useState<string | undefined>(projectIdProp);

  useEffect(() => {
    setResolvedProjectId(projectIdProp);
  }, [projectIdProp]);

  useEffect(() => {
    if (projectIdProp || !caseId || !caseOwner) {
      return;
    }

    let isCancelled = false;

    projectsService
      .getOrCreateForCase({
        case_id: caseId,
        owner: caseOwner,
        ...(caseTitle ? { title: caseTitle } : {}),
      })
      .then((project) => {
        if (!isCancelled) {
          setResolvedProjectId(project.id);
        }
      })
      .catch(() => {
        // Conversation still receives case_id; project association is best-effort.
      });

    return () => {
      isCancelled = true;
    };
  }, [caseId, caseOwner, caseTitle, projectIdProp, projectsService]);

  return projectIdProp ?? resolvedProjectId;
};
