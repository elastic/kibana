/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useId, useState } from 'react';
import type { FC } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ProjectRouting } from '@kbn/es-query';
import { useFetchProjects } from '@kbn/cps-utils';
import { DEFAULT_ML_PROJECT_ROUTING } from '../../../../../../common/constants/cps';
import { useMlKibana } from '../../../../contexts/kibana';

interface Props {
  projectRouting: string | null;
}

export const ProjectScope: FC<Props> = ({ projectRouting }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useId();
  const {
    services: { cps },
  } = useMlKibana();
  const cpsManager = cps?.cpsManager;

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      return cpsManager?.fetchProjects(routing) ?? Promise.resolve(null);
    },
    [cpsManager]
  );

  const displayedProjectRouting = projectRouting ?? DEFAULT_ML_PROJECT_ROUTING;
  const { originProject, linkedProjects, isLoading } = useFetchProjects(
    fetchProjects,
    displayedProjectRouting as ProjectRouting
  );

  if (!cpsManager) {
    return null;
  }

  const totalProjectCount = cpsManager.getTotalProjectCount();
  const projectCount = isLoading ? null : (originProject ? 1 : 0) + linkedProjects.length;

  const button = (
    <EuiButtonEmpty
      size="s"
      data-test-subj="mlJobListProjectScopeButton"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      isLoading={isLoading}
    >
      {projectCount === null ? `–/${totalProjectCount}` : `${projectCount}/${totalProjectCount}`}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      aria-labelledby={popoverTitleId}
    >
      <EuiPopoverTitle id={popoverTitleId}>
        {i18n.translate('xpack.ml.jobsList.projectScopeLabel', {
          defaultMessage: 'Project scope',
        })}
      </EuiPopoverTitle>
      <EuiText size="s" data-test-subj="mlJobListProjectScopeValue">
        {displayedProjectRouting}
      </EuiText>
    </EuiPopover>
  );
};
