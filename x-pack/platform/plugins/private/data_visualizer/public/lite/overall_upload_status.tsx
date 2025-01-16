/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { EuiStepStatus } from '@elastic/eui';
import { EuiProgress, EuiSteps } from '@elastic/eui';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { AnalyzedFile } from './file_manager/file_wrapper';
import { STATUS } from './file_manager/file_manager';
import { type UploadStatus } from './file_manager/file_manager';

interface Props {
  uploadStatus: UploadStatus;
  filesStatus: AnalyzedFile[];
}

export const OverallUploadStatus: FC<Props> = ({ filesStatus, uploadStatus }) => {
  // overallImportStatus: STATUS.NOT_STARTED,
  // indexCreated: STATUS.NOT_STARTED,
  // pipelineCreated: STATUS.NOT_STARTED,
  // modelDeployed: STATUS.NA,
  // dataViewCreated: STATUS.NA,
  // fileImport: STATUS.NOT_STARTED,
  // filesStatus: [],

  const generateStatus = (statuses: STATUS[]): EuiStepStatus => {
    if (statuses.includes(STATUS.STARTED)) {
      return 'current';
    } else if (statuses.includes(STATUS.FAILED)) {
      return 'danger';
    } else if (statuses.every((status) => status === STATUS.COMPLETED)) {
      return 'complete';
    } else {
      return 'incomplete';
    }
  };

  const overallProgress =
    filesStatus.map((file) => file.importProgress).reduce((acc, progress) => acc + progress, 0) /
    filesStatus.length;

  const steps: EuiContainedStepProps[] = [
    {
      title: 'Creating index and ingest pipeline',
      children: <></>,
      status: generateStatus([uploadStatus.indexCreated, uploadStatus.pipelineCreated]),
    },
    ...(uploadStatus.modelDeployed === STATUS.NA
      ? []
      : [
          {
            title: 'Deploying model',
            children: <></>,
            status: generateStatus([uploadStatus.modelDeployed]),
          },
        ]),
    {
      title: 'Uploading files',
      children: (
        <>
          <EuiProgress value={overallProgress} max={100} size="s" />
        </>
      ),
      status: generateStatus([uploadStatus.fileImport]),
    },
    {
      title: 'Creating data view',
      children: <></>,
      status: generateStatus([uploadStatus.dataViewCreated]),
    },
  ];

  return (
    <>
      <EuiSteps steps={steps} titleSize="xxs" />
    </>
  );
};
