/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { PROJECT_ROUTING, ProjectScopePickerFlyout } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import type { ProjectScopeAction } from './use_project_scope_action';

export const ProjectScopeActionFlyout: FC<ProjectScopeAction> = ({
  availableProjects,
  closeFlyout,
  defaultProjectRoutingGetter,
  fetchProjectsByRouting,
  openModal,
  originProjectId,
  targetProjectRouting,
}) => {
  return (
    <ProjectScopePickerFlyout
      applyButtonLabel={i18n.translate(
        'xpack.transform.transformList.projectScopeFlyoutSaveButton',
        {
          defaultMessage: 'Save',
        }
      )}
      availableProjects={availableProjects}
      backButtonLabel={i18n.translate(
        'xpack.transform.transformList.projectScopeFlyoutBackButton',
        {
          defaultMessage: 'Back',
        }
      )}
      canApplyUnchangedProjectRouting
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      discardButtonLabel={i18n.translate(
        'xpack.transform.transformList.projectScopeFlyoutBackButton',
        {
          defaultMessage: 'Back',
        }
      )}
      fetchProjectsByRouting={fetchProjectsByRouting}
      onApplyChanges={openModal}
      onClose={closeFlyout}
      originProjectId={originProjectId}
      projectRouting={targetProjectRouting || PROJECT_ROUTING.ORIGIN}
      projectRoutingStrategy="snapshot"
      title={i18n.translate('xpack.transform.transformList.projectScopeFlyoutTitle', {
        defaultMessage: 'Change project scope',
      })}
    />
  );
};
