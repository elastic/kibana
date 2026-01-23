/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { EuiStepStatus } from '@elastic/eui';
import { EuiSpacer, EuiSteps } from '@elastic/eui';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { STATUS } from '../../../file_upload_manager';
import { FileStatus } from './file_status';
import { useFileUploadContext } from '../../use_file_upload';

export const OverallUploadStatus: FC = () => {
  const { filesStatus, uploadStatus, existingIndexName, indexName } = useFileUploadContext();

  const css = {
    '.euiStep__content': { paddingBlockEnd: '0px' },
  };

  const steps: EuiContainedStepProps[] = [
    ...(uploadStatus.modelDeployed === STATUS.NA
      ? []
      : [
          {
            title: i18n.translate('xpack.fileUpload.overallUploadStatus.deployingModel', {
              defaultMessage: 'Deploying model',
            }),
            children: <></>,
            status: generateStatus([uploadStatus.modelDeployed]),
          },
        ]),
    ...(existingIndexName === null
      ? [
          {
            title: i18n.translate(
              'xpack.fileUpload.overallUploadStatus.creatingIndexAndIngestPipeline',
              {
                defaultMessage: 'Creating index { indexName }',
                values: { indexName },
              }
            ),
            children: <></>,
            status: generateStatus([uploadStatus.indexCreated, uploadStatus.pipelineCreated]),
          },
          {
            title: i18n.translate('xpack.fileUpload.overallUploadStatus.indexSearchable', {
              defaultMessage: 'Index searchable',
            }),
            children: <></>,
            status: generateStatus([
              uploadStatus.indexSearchable
                ? STATUS.COMPLETED
                : uploadStatus.overallImportStatus === STATUS.ABORTED
                ? STATUS.ABORTED
                : STATUS.NOT_STARTED,
            ]),
          },
        ]
      : []),
    {
      title: existingIndexName
        ? i18n.translate('xpack.fileUpload.overallUploadStatus.uploadingFilesExistingIndex', {
            defaultMessage: 'Uploading files to { existingIndexName }',
            values: { existingIndexName },
          })
        : i18n.translate('xpack.fileUpload.overallUploadStatus.uploadingFiles', {
            defaultMessage: 'Uploading files',
          }),
      children: (
        <>
          {filesStatus.map((status, i) => (
            <FileStatus key={i} index={i} lite={false} />
          ))}
          <EuiSpacer />
        </>
      ),
      status: generateStatus([uploadStatus.fileImport]),
    },
    ...(uploadStatus.dataViewCreated === STATUS.NA
      ? []
      : [
          {
            title: i18n.translate('xpack.fileUpload.overallUploadStatus.creatingDataView', {
              defaultMessage: 'Creating data view',
            }),
            children: <></>,
            status: generateStatus([uploadStatus.dataViewCreated]),
          },
        ]),

    {
      title: i18n.translate('xpack.fileUpload.overallUploadStatus.uploadComplete', {
        defaultMessage: 'Upload complete',
      }),
      children: <></>,
      status: generateStatus([
        uploadStatus.overallImportStatus === STATUS.ABORTED
          ? STATUS.ABORTED
          : uploadStatus.overallImportStatus === STATUS.COMPLETED
          ? STATUS.COMPLETED
          : STATUS.NOT_STARTED,
      ]),
    },
    {
      title: i18n.translate('xpack.fileUpload.overallUploadStatus.allDocsSearchable', {
        defaultMessage: 'All docs searchable',
      }),
      children: <></>,
      status: generateStatus([
        uploadStatus.overallImportStatus === STATUS.ABORTED
          ? STATUS.ABORTED
          : uploadStatus.allDocsSearchable
          ? STATUS.COMPLETED
          : STATUS.NOT_STARTED,
      ]),
    },
  ];

  return <EuiSteps steps={steps} titleSize="xxs" css={css} />;
};

function generateStatus(statuses: STATUS[]): EuiStepStatus {
  if (statuses.includes(STATUS.STARTED)) {
    return 'current';
  } else if (statuses.includes(STATUS.FAILED) || statuses.includes(STATUS.ABORTED)) {
    return 'danger';
  } else if (statuses.every((status) => status === STATUS.COMPLETED)) {
    return 'complete';
  } else {
    return 'incomplete';
  }
}
