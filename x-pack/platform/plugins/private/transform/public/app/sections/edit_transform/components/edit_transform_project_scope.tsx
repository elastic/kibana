/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

import { useAppDependencies } from '../../../app_dependencies';
import { ProjectScopeSelector } from '../../create_transform/components/wizard/project_scope_selector';

import { useEditTransformFlyoutActions } from '../state_management/edit_transform_flyout_state';
import { useFormField } from '../state_management/selectors/form_field';

export const EditTransformProjectScope: FC = () => {
  const { cps } = useAppDependencies();
  const cpsManager = cps?.cpsManager;
  const { value } = useFormField('projectRouting');
  const { setFormField } = useEditTransformFlyoutActions();

  if (!cps?.isTierEligible || !cpsManager) {
    return null;
  }

  return (
    <>
      <ProjectScopeSelector
        cpsManager={cpsManager}
        onProjectRoutingChange={(nextProjectRouting: ProjectRouting) => {
          if (nextProjectRouting !== undefined) {
            setFormField({ field: 'projectRouting', value: nextProjectRouting });
          }
        }}
        projectRouting={value || PROJECT_ROUTING.ORIGIN}
      />
      <EuiSpacer size="l" />
    </>
  );
};
