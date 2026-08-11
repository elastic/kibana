/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';

import { MlProjectPickerPanel } from '@kbn/ml-cps';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject, from, switchMap } from 'rxjs';
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
  const projectRouting$ = useRef(new BehaviorSubject<ProjectRouting>(undefined));

  useEffect(() => {
    projectRouting$.current.next(projectRouting || undefined);
  }, [projectRouting]);

  const getProjects$ = useCallback(() => {
    return projectRouting$.current.pipe(
      switchMap((routing) => {
        return from(cpsManager?.fetchProjects(routing) ?? Promise.resolve(null));
      })
    );
  }, [cpsManager]);

  const defaultProjectRoutingGetter = useCallback(() => {
    return cpsManager?.getDefaultProjectRouting();
  }, [cpsManager]);

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
      <MlProjectPickerPanel
        projectRouting$={projectRouting$.current}
        onProjectRoutingChange={onProjectRoutingChange}
        getActiveRouteProjects$={getProjects$}
        defaultProjectRoutingGetter={defaultProjectRoutingGetter}
        totalProjectCount={totalProjectCount}
        isReadonly={false}
        disabled={projectRouting$?.current.value === undefined}
      />
    </Description>
  );
};
