/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING, ProjectScopePickerFlyoutContent, useFetchProjects } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import { useAppDependencies } from '../../../app_dependencies';

import { useEditTransformFlyoutActions } from '../state_management/edit_transform_flyout_state';
import { useFormField } from '../state_management/selectors/form_field';

const changeProjectScopeTitle = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScopeFlyoutTitle',
  {
    defaultMessage: 'Change project scope',
  }
);

const backToEditTransformLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutProjectScopeBackAriaLabel',
  {
    defaultMessage: 'Back to edit transform',
  }
);

interface EditTransformProjectScopeFlyoutProps {
  onClose: () => void;
}

export const EditTransformProjectScopeFlyout: FC<EditTransformProjectScopeFlyoutProps> = ({
  onClose,
}) => {
  const { cps } = useAppDependencies();
  const cpsManager = cps?.cpsManager;
  const { value } = useFormField('projectRouting');
  const { setFormField } = useEditTransformFlyoutActions();
  const initialProjectRouting = (value || PROJECT_ROUTING.ORIGIN) as ProjectRouting;
  const [stagedProjectRouting, setStagedProjectRouting] =
    useState<ProjectRouting>(initialProjectRouting);
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) =>
      cpsManager?.fetchProjects(routing) ?? Promise.resolve({ origin: null, linkedProjects: [] }),
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

  const applyProjectScope = useCallback(() => {
    if (stagedProjectRouting !== undefined) {
      setFormField({ field: 'projectRouting', value: stagedProjectRouting });
    }
    onClose();
  }, [onClose, setFormField, stagedProjectRouting]);

  return (
    <ProjectScopePickerFlyoutContent
      applyButtonLabel={i18n.translate(
        'xpack.transform.transformList.editFlyoutProjectScopeApplyButtonText',
        {
          defaultMessage: 'Apply project scope',
        }
      )}
      availableProjects={availableProjects}
      backButtonLabel={backToEditTransformLabel}
      discardButtonLabel={i18n.translate(
        'xpack.transform.transformList.editFlyoutProjectScopeDiscardButtonText',
        {
          defaultMessage: 'Discard changes',
        }
      )}
      isApplyDisabled={Boolean(error) || isLoading}
      isReadOnly={Boolean(error) || isLoading}
      onApplyChanges={applyProjectScope}
      onClose={onClose}
      onDiscardChanges={onClose}
      onProjectRoutingChange={setStagedProjectRouting}
      originProjectId={originProject?._id}
      projectRouting={stagedProjectRouting}
      title={changeProjectScopeTitle}
      titleId="transformEditProjectScopeFlyoutTitle"
    />
  );
};
