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
  useFetchProjects,
} from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import { useAppDependencies } from '../../../app_dependencies';
import { useGetTransformCpsEnabled } from '../../../hooks/use_get_transform_cps_enabled';

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

const getProjectCount = (originProject: CPSProject | null, linkedProjects: CPSProject[]): number =>
  (originProject ? 1 : 0) + linkedProjects.length;

const getProjectScopeButtonLabel = ({
  projectRouting,
  selectedProjectCount,
  totalProjectCount,
}: {
  projectRouting: ProjectRouting;
  selectedProjectCount: number;
  totalProjectCount: number;
}): string => {
  if (projectRouting === PROJECT_ROUTING.ALL) {
    return allProjectsLabel;
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return thisProjectLabel;
  }

  return getCustomProjectScopeLabel(selectedProjectCount, totalProjectCount);
};

export interface LoadedTransformProjectScopeProjects {
  originProject: CPSProject | null;
  linkedProjects: CPSProject[];
}

interface EditTransformProjectScopeProps {
  onOpenProjectScope: (projects: LoadedTransformProjectScopeProjects) => void;
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
  const {
    originProject: routedOriginProject,
    linkedProjects: routedLinkedProjects,
    isLoading: isRoutingLoading,
    error: routingError,
  } = useFetchProjects(fetchProjects, value || PROJECT_ROUTING.ORIGIN);
  const totalProjectCount = getProjectCount(originProject, linkedProjects);
  const selectedProjectCount = getProjectCount(routedOriginProject, routedLinkedProjects);
  const hasError = Boolean(error || routingError);
  const isProjectScopeLoading = isLoading || isRoutingLoading;
  const hasLinkedProjects = linkedProjects.length > 0;
  const projectRouting = (value || PROJECT_ROUTING.ORIGIN) as ProjectRouting;
  const buttonLabel = useMemo(
    () =>
      getProjectScopeButtonLabel({
        projectRouting,
        selectedProjectCount,
        totalProjectCount,
      }),
    [projectRouting, selectedProjectCount, totalProjectCount]
  );
  const openProjectScope = useCallback(() => {
    onOpenProjectScope({ originProject, linkedProjects });
  }, [linkedProjects, onOpenProjectScope, originProject]);

  if (!isProjectScopeLoading && !hasError && !hasLinkedProjects) {
    return null;
  }

  return (
    <>
      <EuiFormRow
        error={hasError ? unavailableLabel : undefined}
        isInvalid={hasError}
        label={projectScopeLabel}
      >
        <EuiButton
          color="text"
          data-test-subj="transformEditProjectScopeButton"
          iconType="crossProjectSearch"
          isDisabled={isProjectScopeLoading || hasError}
          isLoading={isProjectScopeLoading}
          onClick={openProjectScope}
          size="m"
        >
          {hasError ? unavailableLabel : isProjectScopeLoading ? loadingLabel : buttonLabel}
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
  const canCheckProjectScope = Boolean(cps?.isTierEligible && cpsManager);
  const { data: isTransformCpsEnabled } = useGetTransformCpsEnabled({
    enabled: canCheckProjectScope,
  });

  if (!canCheckProjectScope || isTransformCpsEnabled !== true || !cpsManager) {
    return null;
  }

  return (
    <EditTransformProjectScopeButton
      cpsManager={cpsManager}
      onOpenProjectScope={onOpenProjectScope}
    />
  );
};
