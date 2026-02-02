/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../../../job_creator_context';

export const ProjectRouting: FC = () => {
  const { jobCreator, jobCreatorUpdated } = useContext(JobCreatorContext);

  const [projectRouting, setProjectRouting] = useState(jobCreator.projectRouting);

  useEffect(() => {
    setProjectRouting(jobCreator.projectRouting === null ? '' : jobCreator.projectRouting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return (
    <>
      <EuiSpacer size="m" />

      <EuiText size="s">
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.ml.newJob.wizard.projectRouting.label', {
              defaultMessage: 'Project routing: ',
            })}
          </EuiFlexItem>
          <EuiFlexItem>{projectRouting}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </>
  );
};
