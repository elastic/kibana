/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING, ProjectScopePickerFlyoutContent } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import { useAppDependencies } from '../../../app_dependencies';

import { useEditTransformFlyoutActions } from '../state_management/edit_transform_flyout_state';
import { useFormField } from '../state_management/selectors/form_field';
import type { LoadedTransformProjectScopeProjects } from './edit_transform_project_scope';

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
  projects: LoadedTransformProjectScopeProjects;
}

export const EditTransformProjectScopeFlyout: FC<EditTransformProjectScopeFlyoutProps> = ({
  onClose,
  projects,
}) => {
  const { cps } = useAppDependencies();
  const { value } = useFormField('projectRouting');
  const { setFormField } = useEditTransformFlyoutActions();
  const defaultProjectRouting = cps?.cpsManager?.getDefaultProjectRouting() ?? PROJECT_ROUTING.ALL;
  const persistedProjectRouting = (value || PROJECT_ROUTING.ORIGIN) as NonNullable<ProjectRouting>;
  const [stagedProjectRouting, setStagedProjectRouting] = useState<
    NonNullable<ProjectRouting> | undefined
  >();
  const draftProjectRouting = stagedProjectRouting ?? persistedProjectRouting;
  const [pickerResetCounter, setPickerResetCounter] = useState(0);
  const availableProjects = useMemo(
    () =>
      projects.originProject
        ? [projects.originProject, ...projects.linkedProjects]
        : projects.linkedProjects,
    [projects.linkedProjects, projects.originProject]
  );

  const applyProjectScope = useCallback(() => {
    setFormField({ field: 'projectRouting', value: draftProjectRouting });
    onClose();
  }, [draftProjectRouting, onClose, setFormField]);

  const discardProjectScopeChanges = useCallback(() => {
    setStagedProjectRouting(undefined);
    setPickerResetCounter((counter) => counter + 1);
  }, []);

  return (
    <ProjectScopePickerFlyoutContent
      applyButtonLabel={i18n.translate(
        'xpack.transform.transformList.editFlyoutProjectScopeApplyButtonText',
        {
          defaultMessage: 'Apply changes',
        }
      )}
      availableProjects={availableProjects}
      backButtonLabel={backToEditTransformLabel}
      defaultProjectRouting={defaultProjectRouting}
      discardButtonLabel={i18n.translate(
        'xpack.transform.transformList.editFlyoutProjectScopeDiscardButtonText',
        {
          defaultMessage: 'Discard changes',
        }
      )}
      key={pickerResetCounter}
      onApplyChanges={applyProjectScope}
      onClose={onClose}
      onDiscardChanges={discardProjectScopeChanges}
      onProjectRoutingChange={setStagedProjectRouting}
      originProjectId={projects.originProject?._id}
      projectRouting={draftProjectRouting}
      title={changeProjectScopeTitle}
      titleId="transformEditProjectScopeFlyoutTitle"
    />
  );
};
