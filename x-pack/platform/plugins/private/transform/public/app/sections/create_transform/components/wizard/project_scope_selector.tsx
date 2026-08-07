/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFormRow, EuiPopover, EuiText } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import {
  getSelectedProjectIdsFromProjectRouting,
  type CPSProject,
  type ICPSManager,
  PROJECT_ROUTING,
  ProjectScopePicker,
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

  const selectedProjectIds = getSelectedProjectIdsFromProjectRouting({
    availableProjects,
    originProjectId,
    projectRouting,
  });

  return getCustomProjectScopeLabel(selectedProjectIds.length, availableProjects.length);
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
  const effectiveProjectRouting = projectRouting ?? cpsManager.getDefaultProjectRouting();
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    PROJECT_ROUTING.ALL
  );
  const availableProjects = useMemo(
    () => (originProject ? [originProject, ...linkedProjects] : linkedProjects),
    [linkedProjects, originProject]
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
        projectRouting: effectiveProjectRouting,
      });

  return (
    <EuiFormRow label={projectScopeLabel}>
      <EuiPopover
        aria-label={projectScopeLabel}
        button={
          <EuiButtonEmpty
            data-test-subj="transformProjectScopePicker"
            disabled={isLoading || Boolean(error)}
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
            size="s"
          >
            {buttonLabel}
          </EuiButtonEmpty>
        }
        closePopover={() => setIsPopoverOpen(false)}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        {error ? (
          <EuiText color="danger" size="s">
            <p>{unavailableLabel}</p>
          </EuiText>
        ) : (
          <ProjectScopePicker
            availableProjects={availableProjects}
            onProjectRoutingChange={onProjectRoutingChange}
            originProjectId={originProjectId}
            projectRouting={effectiveProjectRouting}
            requiredProjectId={originProjectId}
          />
        )}
      </EuiPopover>
    </EuiFormRow>
  );
};
