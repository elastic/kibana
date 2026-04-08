/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';

import { ProjectPicker, useFetchProjects } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { useMlKibana } from '../../../../../../contexts/kibana';
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

  const titleId = useGeneratedHtmlId({
    prefix: 'project-routing',
  });

  const {
    services: { cps },
  } = useMlKibana();
  const cpsManager = cps?.cpsManager;
  const totalProjectCount = cpsManager?.getTotalProjectCount() ?? 0;
  const [projectRouting, setProjectRouting] = useState(jobCreator.projectRouting);

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      return cpsManager?.fetchProjects(routing) ?? Promise.resolve(null);
    },
    [cpsManager]
  );

  const projects = useFetchProjects(fetchProjects, jobCreator.projectRouting ?? undefined);

  useEffect(() => {
    setProjectRouting(jobCreator.projectRouting ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  const onProjectRoutingChange = useCallback(
    (newProjectRouting: ProjectRouting) => {
      jobCreator.projectRouting = newProjectRouting as string | null;
      setProjectRouting(newProjectRouting as string | null);
      jobCreatorUpdate();
    },
    [jobCreator, jobCreatorUpdate]
  );

  return (
    <Description titleId={titleId}>
      <ProjectPicker
        projectRouting={projectRouting ?? undefined}
        onProjectRoutingChange={onProjectRoutingChange}
        projects={projects}
        totalProjectCount={totalProjectCount}
        isReadonly={false}
      />
    </Description>
  );
};
