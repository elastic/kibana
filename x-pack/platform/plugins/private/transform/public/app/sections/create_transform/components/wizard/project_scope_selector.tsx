/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiButton, EuiFormRow, EuiPopover, EuiText } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import {
  type CPSProject,
  type ICPSManager,
  PROJECT_ROUTING,
  ProjectScopePicker,
  projectRoutingCodec,
  useFetchProjects,
} from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

const projectScopeLabel = i18n.translate('xpack.transform.transformsWizard.projectScopeLabel', {
  defaultMessage: 'Project scope',
});

const allProjectsLabel = i18n.translate(
  'xpack.transform.transformsWizard.projectScope.allProjectsLabel',
  {
    defaultMessage: 'All projects',
  }
);

const thisProjectLabel = i18n.translate(
  'xpack.transform.transformsWizard.projectScope.thisProjectLabel',
  {
    defaultMessage: 'This project',
  }
);

const loadingLabel = i18n.translate('xpack.transform.transformsWizard.projectScope.loadingLabel', {
  defaultMessage: 'Loading',
});

const unavailableLabel = i18n.translate(
  'xpack.transform.transformsWizard.projectScope.unavailableLabel',
  {
    defaultMessage: 'Project scope unavailable',
  }
);

const getCustomProjectScopeLabel = (selectedCount: number, totalCount: number): string =>
  i18n.translate('xpack.transform.transformsWizard.projectScope.customProjectsLabel', {
    defaultMessage: '{selectedCount}/{totalCount} projects',
    values: { selectedCount, totalCount },
  });

const getSelectedProjectCount = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting: ProjectRouting;
}): number => {
  if (projectRouting === PROJECT_ROUTING.ALL) {
    return availableProjects.length;
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return originProjectId ? 1 : 0;
  }

  const { excludedProjectIds, selectedProjectIds } = projectRoutingCodec.decode(projectRouting);

  if (selectedProjectIds.length > 0) {
    return selectedProjectIds.filter((projectId) =>
      availableProjects.some((project) => project._id === projectId)
    ).length;
  }

  if (excludedProjectIds.length > 0) {
    return availableProjects.filter((project) => !excludedProjectIds.includes(project._id)).length;
  }

  return availableProjects.length;
};

const getProjectScopeButtonLabel = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting: ProjectRouting;
}): string => {
  if (projectRouting === PROJECT_ROUTING.ALL) {
    return allProjectsLabel;
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return thisProjectLabel;
  }

  const selectedProjectCount = getSelectedProjectCount({
    availableProjects,
    originProjectId,
    projectRouting,
  });

  return getCustomProjectScopeLabel(selectedProjectCount, availableProjects.length);
};

export interface ProjectScopeSelectorProps {
  cpsManager: ICPSManager;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
  projectRouting?: ProjectRouting;
}

export const ProjectScopeSelector = ({
  cpsManager,
  onProjectRoutingChange,
  projectRouting,
}: ProjectScopeSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const effectiveProjectRouting = useRef(projectRouting ?? cpsManager.getDefaultProjectRouting());
  effectiveProjectRouting.current = projectRouting ?? cpsManager.getDefaultProjectRouting();

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    PROJECT_ROUTING.ALL
  );

  const availableProjects = useMemo(() => {
    return originProject ? [originProject, ...linkedProjects] : linkedProjects;
  }, [linkedProjects, originProject]);

  const fetchProjectsByRouting = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );

  if (!isLoading && !error && linkedProjects.length === 0) {
    return null;
  }

  const originProjectId = originProject?._id;
  const buttonLabel = isLoading
    ? loadingLabel
    : getProjectScopeButtonLabel({
        availableProjects,
        originProjectId,
        projectRouting: effectiveProjectRouting.current,
      });

  return (
    <EuiFormRow
      css={{ inlineSize: 'fit-content' }}
      error={error ? unavailableLabel : undefined}
      isInvalid={Boolean(error)}
      label={projectScopeLabel}
    >
      <EuiPopover
        aria-label={projectScopeLabel}
        button={
          <EuiButton
            color="text"
            data-test-subj="transformProjectScopePicker"
            iconType="crossProjectSearch"
            isDisabled={isLoading || Boolean(error)}
            isLoading={isLoading}
            onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
            size="m"
          >
            {buttonLabel}
          </EuiButton>
        }
        closePopover={() => setIsPopoverOpen(false)}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        panelProps={{ css: { width: 560 } }}
      >
        {error ? (
          <EuiText color="danger" size="s">
            <p>{unavailableLabel}</p>
          </EuiText>
        ) : (
          <ProjectScopePicker
            availableProjects={availableProjects}
            originProjectId={originProjectId}
            onProjectRoutingChange={onProjectRoutingChange}
            projectRouting={effectiveProjectRouting.current!}
            fetchProjectsByRouting={fetchProjectsByRouting}
            projectRoutingStrategy="snapshot"
          />
        )}
      </EuiPopover>
    </EuiFormRow>
  );
};
