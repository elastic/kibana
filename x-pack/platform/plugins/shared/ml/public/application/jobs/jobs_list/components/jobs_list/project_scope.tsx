/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useId, useState } from 'react';
import type { FC } from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ProjectRouting } from '@kbn/es-query';
import { useFetchProjects, ProjectPickerContent, PROJECT_ROUTING } from '@kbn/cps-utils';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { getIsMlCpsEnabled } from '../../../../services/ml_server_info';
import { DEFAULT_ML_PROJECT_ROUTING } from '../../../../../../common/constants/cps';
import { useMlKibana } from '../../../../contexts/kibana';

interface Props {
  projectRouting: string | null;
  job: MlSummaryJob;
}

export const ProjectScope: FC<Props> = ({ projectRouting, job }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useId();
  const {
    services: { cps },
  } = useMlKibana();
  const cpsManager = cps?.cpsManager;
  const isMlCpsEnabled = getIsMlCpsEnabled();

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      return cpsManager?.fetchProjects(routing) ?? Promise.resolve(null);
    },
    [cpsManager]
  );

  // When project_routing is unset: UIAM-enabled jobs search all projects;
  // otherwise they are scoped to the origin project only.
  const displayedProjectRouting =
    projectRouting ?? (job.isUiamEnabled ? PROJECT_ROUTING.ALL : DEFAULT_ML_PROJECT_ROUTING);
  const { originProject, linkedProjects, isLoading } = useFetchProjects(
    fetchProjects,
    displayedProjectRouting as ProjectRouting
  );

  if (!isMlCpsEnabled || !cpsManager) {
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
      panelPaddingSize="none"
    >
      <ProjectPickerContent
        customHeaderText={i18n.translate('xpack.ml.jobsList.projectScopeLabel', {
          defaultMessage: 'Project scope',
        })}
        projectRouting={displayedProjectRouting as ProjectRouting}
        fetchProjectsByRouting={fetchProjects}
        controlsState="hidden"
      />
    </EuiPopover>
  );
};
