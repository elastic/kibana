/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import { EuiButton, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import {
  type CPSProject,
  type ICPSManager,
  PROJECT_ROUTING,
  projectRoutingCodec,
  useFetchProjects,
} from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import { useAppDependencies } from '../../../app_dependencies';

import { useFormField } from '../state_management/selectors/form_field';

const projectScopeLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScopeLabel',
  {
    defaultMessage: 'Project scope',
  }
);

const allProjectsLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScope.allProjectsLabel',
  {
    defaultMessage: 'All projects',
  }
);

const thisProjectLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScope.thisProjectLabel',
  {
    defaultMessage: 'This project',
  }
);

const loadingLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScope.loadingLabel',
  {
    defaultMessage: 'Loading',
  }
);

const unavailableLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScope.unavailableLabel',
  {
    defaultMessage: 'Project scope unavailable',
  }
);

const getCustomProjectScopeLabel = (selectedCount: number, totalCount: number): string =>
  i18n.translate('xpack.transform.transformList.editFlyoutProjectScope.customProjectsLabel', {
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

interface EditTransformProjectScopeProps {
  onOpenProjectScope: () => void;
}

interface EditTransformProjectScopeButtonProps extends EditTransformProjectScopeProps {
  cpsManager: ICPSManager;
}

const EditTransformProjectScopeButton: FC<EditTransformProjectScopeButtonProps> = ({
  cpsManager,
  onOpenProjectScope,
}) => {
  const { value } = useFormField('projectRouting');
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
  const projectRouting = (value || PROJECT_ROUTING.ORIGIN) as ProjectRouting;

  if (!isLoading && !error && linkedProjects.length === 0) {
    return null;
  }

  const buttonLabel = isLoading
    ? loadingLabel
    : getProjectScopeButtonLabel({
        availableProjects,
        originProjectId: originProject?._id,
        projectRouting,
      });

  return (
    <>
      <EuiFormRow
        error={error ? unavailableLabel : undefined}
        isInvalid={Boolean(error)}
        label={projectScopeLabel}
      >
        <EuiButton
          color="text"
          data-test-subj="transformEditProjectScopeButton"
          iconType="crossProjectSearch"
          isDisabled={isLoading || Boolean(error)}
          isLoading={isLoading}
          onClick={onOpenProjectScope}
          size="m"
        >
          {error ? unavailableLabel : buttonLabel}
        </EuiButton>
      </EuiFormRow>
      <EuiSpacer size="l" />
    </>
  );
};

export const EditTransformProjectScope: FC<EditTransformProjectScopeProps> = ({
  onOpenProjectScope,
}) => {
  const { cps } = useAppDependencies();
  const cpsManager = cps?.cpsManager;

  if (!cps?.isTierEligible || !cpsManager) {
    return null;
  }

  return (
    <EditTransformProjectScopeButton
      cpsManager={cpsManager}
      onOpenProjectScope={onOpenProjectScope}
    />
  );
};
