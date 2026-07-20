/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiLink, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import {
  type ICPSManager,
  PROJECT_ROUTING,
  ProjectPickerContent,
  useFetchProjects,
} from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

const originProjectLabel = i18n.translate(
  'xpack.transform.transformList.projectScope.originLabel',
  {
    defaultMessage: 'This project',
  }
);

const allProjectsLabel = i18n.translate('xpack.transform.transformList.projectScope.allLabel', {
  defaultMessage: 'All',
});

const projectScopeLabel = i18n.translate('xpack.transform.transformList.projectScope.columnLabel', {
  defaultMessage: 'Project scope',
});

const loadingProjectScopeLabel = i18n.translate(
  'xpack.transform.transformList.projectScope.loadingLabel',
  {
    defaultMessage: 'Loading',
  }
);

const unknownProjectScopeLabel = i18n.translate(
  'xpack.transform.transformList.projectScope.unknownLabel',
  {
    defaultMessage: 'Unknown',
  }
);

const getEffectiveProjectRouting = (projectRouting?: ProjectRouting): ProjectRouting => {
  return projectRouting ?? PROJECT_ROUTING.ORIGIN;
};

export const getStaticProjectScopeLabel = (projectRouting?: ProjectRouting): string | undefined => {
  if (projectRouting === PROJECT_ROUTING.ALL) {
    return allProjectsLabel;
  }

  if (projectRouting === undefined || projectRouting === PROJECT_ROUTING.ORIGIN) {
    return originProjectLabel;
  }
};

export const getProjectScopeSortValue = (projectRouting?: ProjectRouting): string => {
  if (projectRouting === PROJECT_ROUTING.ALL) {
    return 'all';
  }

  // A missing project routing value means the transform is origin-only, which is
  // the same display bucket as the explicit `_alias:_origin` routing value.
  if (projectRouting === undefined || projectRouting === PROJECT_ROUTING.ORIGIN) {
    return 'origin';
  }

  return `custom:${projectRouting}`;
};

interface ProjectScopeColumnProps {
  cpsManager: ICPSManager;
  projectRouting?: ProjectRouting;
}

const ProjectScopePopoverContent = ({ cpsManager, projectRouting }: ProjectScopeColumnProps) => {
  const effectiveProjectRouting = getEffectiveProjectRouting(projectRouting);
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );
  const projects = useFetchProjects(fetchProjects, effectiveProjectRouting);

  return (
    <ProjectPickerContent
      projectRouting={effectiveProjectRouting}
      projects={projects}
      controlsState="hidden"
    />
  );
};

const CustomProjectScopeLabel = ({ cpsManager, projectRouting }: ProjectScopeColumnProps) => {
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    projectRouting
  );

  if (isLoading) {
    return loadingProjectScopeLabel;
  }

  if (error) {
    return unknownProjectScopeLabel;
  }

  const projectCount = (originProject ? 1 : 0) + linkedProjects.length;

  if (projectCount === 0) {
    return unknownProjectScopeLabel;
  }

  return `${projectCount}/${cpsManager.getTotalProjectCount()}`;
};

const ProjectScopeLabel = ({ cpsManager, projectRouting }: ProjectScopeColumnProps) => {
  return (
    <>
      {getStaticProjectScopeLabel(projectRouting) ?? (
        <CustomProjectScopeLabel cpsManager={cpsManager} projectRouting={projectRouting} />
      )}
    </>
  );
};

export const ProjectScopeColumn = ({ cpsManager, projectRouting }: ProjectScopeColumnProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (cpsManager.getTotalProjectCount() <= 1) {
    return (
      <EuiText size="s" data-test-subj="transformListProjectScope">
        <ProjectScopeLabel cpsManager={cpsManager} projectRouting={projectRouting} />
      </EuiText>
    );
  }

  return (
    <EuiPopover
      button={
        <EuiLink
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          data-test-subj="transformListProjectScopeButton"
        >
          <ProjectScopeLabel cpsManager={cpsManager} projectRouting={projectRouting} />
        </EuiLink>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      repositionOnScroll
    >
      <EuiPopoverTitle paddingSize="s">{projectScopeLabel}</EuiPopoverTitle>
      <ProjectScopePopoverContent cpsManager={cpsManager} projectRouting={projectRouting} />
    </EuiPopover>
  );
};
