/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useMlKibana } from '../../../../contexts/kibana';

interface Props {
  projectRouting: string | null;
}

function getProjectCountFromRouting(projectRouting: string, totalProjectCount: number): number {
  const projectsPart = projectRouting.split(':')[1];
  if (projectsPart === undefined || projectsPart === '*') {
    return totalProjectCount;
  }
  return projectsPart.split(',').filter((project) => project.length > 0).length;
}

export const ProjectScope: FC<Props> = ({ projectRouting }) => {
  const {
    services: { cps },
  } = useMlKibana();
  const cpsManager = cps?.cpsManager;

  if (!cpsManager || projectRouting == null) {
    return null;
  }

  const totalProjectCount = cpsManager.getTotalProjectCount();
  const projectCount = getProjectCountFromRouting(projectRouting, totalProjectCount);

  return (
    <EuiButtonEmpty size="s" data-test-subj="mlJobListProjectScopeButton">
      {`${projectCount}/${totalProjectCount}`}
    </EuiButtonEmpty>
  );
};
