/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';

import { MlProjectPickerPanel } from '@kbn/ml-cps';
import type { ProjectRouting } from '@kbn/es-query';
import { useMlKibana } from '../../../../../../contexts/kibana';
import { useNewJobCapsService } from '../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreatorContext } from '../../job_creator_context';
import type {
  MultiMetricJobCreator,
  PopulationJobCreator,
  AdvancedJobCreator,
} from '../../../../common/job_creator';
import { Description } from './description';

export const ProjectRoutingSelect: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator | AdvancedJobCreator;
  const newJobCapsService = useNewJobCapsService();

  const titleId = useGeneratedHtmlId({
    prefix: 'project-routing',
  });

  const {
    services: { cps },
  } = useMlKibana();
  const cpsManager = cps?.cpsManager;
  const totalProjectCount = cpsManager?.getTotalProjectCount() ?? 0;
  const [projectRouting, setProjectRouting] = useState(jobCreator.projectRouting);

  const fetchProjectsByRouting = useCallback(
    (routing?: ProjectRouting) => cpsManager?.fetchProjects(routing) ?? Promise.resolve(null),
    [cpsManager]
  );

  const defaultProjectRoutingGetter = useCallback(() => {
    return cpsManager?.getDefaultProjectRouting();
  }, [cpsManager]);

  useEffect(() => {
    setProjectRouting(jobCreator.projectRouting ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  const onProjectRoutingChange = useCallback(
    (newProjectRouting: ProjectRouting) => {
      const routing =
        typeof newProjectRouting === 'string' && newProjectRouting !== ''
          ? newProjectRouting
          : undefined;
      jobCreator.projectRouting = routing ?? null;
      setProjectRouting(routing ?? null);
      jobCreatorUpdate();
      void newJobCapsService
        .initializeFromDataVIew(jobCreator.dataView, true, true, routing)
        .then(() => {
          jobCreatorUpdate();
        });
    },
    [jobCreator, jobCreatorUpdate, newJobCapsService]
  );

  return (
    <Description titleId={titleId}>
      <MlProjectPickerPanel
        projectRouting={projectRouting || undefined}
        onProjectRoutingChange={onProjectRoutingChange}
        fetchProjectsByRouting={fetchProjectsByRouting}
        defaultProjectRoutingGetter={defaultProjectRoutingGetter}
        totalProjectCount={totalProjectCount}
        isReadonly={false}
        disabled={!projectRouting}
      />
    </Description>
  );
};
