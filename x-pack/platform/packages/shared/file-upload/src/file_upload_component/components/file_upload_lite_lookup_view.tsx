/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepStatus } from '@elastic/eui';
import { EuiButton, EuiSpacer, EuiSteps, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GetAdditionalLinks, ResultLinks } from '@kbn/file-upload-common';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { STATUS } from '../../../file_upload_manager';
import { FileClashWarning } from './file_clash_warning';
import { FileStatus } from './file_status';
import { MappingEditor } from './mapping_editor';
import { useFileUploadContext } from '../../use_file_upload';

interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  onClose?: () => void;
  setFileUploadActive: (active: boolean) => void;
  setDropzoneDisabled?: (disabled: boolean) => void;
}

interface StepsStatus {
  analysis: STATUS;
  mapping: STATUS;
  upload: STATUS;
  finish: STATUS;
}

export const FileUploadLiteLookUpView: FC<Props> = ({
  onClose,
  setDropzoneDisabled,
  setFileUploadActive,
}) => {
  const { filesStatus, uploadStatus, fileClashes, onImportClick, indexName } =
    useFileUploadContext();

  const [stepsStatus, setStepsStatus] = useState<StepsStatus>({
    analysis: STATUS.STARTED,
    mapping: STATUS.NOT_STARTED,
    upload: STATUS.NOT_STARTED,
    finish: STATUS.NOT_STARTED,
  });

  const setStep = useCallback((step: keyof StepsStatus, status: STATUS) => {
    setStepsStatus((prev) => ({
      ...prev,
      [step]: status,
    }));
  }, []);

  useEffect(() => {
    if (uploadStatus.overallImportStatus === STATUS.COMPLETED) {
      setStep('finish', STATUS.COMPLETED);
    }
  }, [uploadStatus.overallImportStatus, setStep]);

  useEffect(() => {
    setDropzoneDisabled?.(stepsStatus.analysis !== STATUS.STARTED);
  }, [stepsStatus.analysis, setDropzoneDisabled]);

  useEffect(() => {
    setFileUploadActive(filesStatus.length > 0);
    return () => {
      setFileUploadActive(false);
    };
  }, [filesStatus, setFileUploadActive]);

  const importClick = useCallback(() => {
    onImportClick();
    setStep('mapping', STATUS.COMPLETED);
    setStep('upload', STATUS.STARTED);
  }, [onImportClick, setStep]);

  const finalStatement = useMemo(() => {
    const { totalDocs, totalFailedDocs } = uploadStatus;
    if (totalFailedDocs === totalDocs) {
      return i18n.translate('xpack.fileUpload.lookupJoinUpload.allDocumentsFailed', {
        defaultMessage: 'Index created, but all documents failed to upload.',
      });
    } else if (totalFailedDocs > 0) {
      return i18n.translate('xpack.fileUpload.lookupJoinUpload.someDocumentsFailed', {
        defaultMessage:
          'Index created, but {totalFailedDocs} out of {totalDocs} documents failed to upload.',
        values: { totalFailedDocs, totalDocs },
      });
    } else {
      return i18n.translate('xpack.fileUpload.lookupJoinUpload.allDocumentsUploaded', {
        defaultMessage: 'All files uploaded successfully.',
      });
    }
  }, [uploadStatus]);

  if (indexName === null) {
    return null;
  }

  const css = {
    '.euiStep__content': { paddingBlockEnd: '0px' },
  };

  const steps: EuiContainedStepProps[] = [
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.analysis', {
        defaultMessage: 'Review data',
      }),
      children:
        stepsStatus.analysis === STATUS.STARTED ? (
          <>
            {filesStatus.map((status, i) => (
              <FileStatus
                key={i}
                index={i}
                lite={true}
                showOverrideButton={false}
                showExplanationButton={false}
                showSettingsButton={false}
                showFileContents={true}
              />
            ))}

            {fileClashes ? <FileClashWarning /> : null}

            <EuiSpacer />

            <EuiButton
              data-test-subj="fileUploadLiteLookupReviewButton"
              disabled={fileClashes || uploadStatus.analysisStatus !== STATUS.COMPLETED}
              onClick={() => {
                setStep('analysis', STATUS.COMPLETED);
                setStep('mapping', STATUS.STARTED);
              }}
            >
              <FormattedMessage id="xpack.fileUpload.continue" defaultMessage="Continue" />
            </EuiButton>

            <EuiSpacer />
          </>
        ) : null,
      status: generateStatus(stepsStatus.analysis),
    },
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.reviewMapping', {
        defaultMessage: 'Review mapping',
      }),
      children:
        stepsStatus.mapping === STATUS.STARTED ? (
          <>
            <MappingEditor onImportClick={importClick} />

            <EuiSpacer />
          </>
        ) : null,
      status: generateStatus(stepsStatus.mapping),
    },
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.uploadingFilesToIndex', {
        defaultMessage: 'Upload {count, plural, one {# file} other {# files}}  to {indexName}',
        values: { count: filesStatus.length, indexName },
      }),
      children:
        stepsStatus.upload === STATUS.STARTED ? (
          <>
            {filesStatus.map((status, i) => (
              <FileStatus key={i} index={i} lite={false} />
            ))}
            <EuiSpacer />
          </>
        ) : null,
      status: generateStatus(uploadStatus.overallImportStatus),
    },
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.finish', {
        defaultMessage: 'Finalizing',
      }),
      children:
        stepsStatus.finish === STATUS.COMPLETED ? (
          <>
            <EuiText size="s">{finalStatement}</EuiText>

            <EuiSpacer />

            <EuiButton
              data-test-subj="fileUploadLiteLookupFinishButton"
              disabled={uploadStatus.allDocsSearchable === false}
              onClick={() => {
                onClose?.();
              }}
            >
              <FormattedMessage id="xpack.fileUpload.continue" defaultMessage="Finish" />
            </EuiButton>
          </>
        ) : null,
      status: generateStatus(
        stepsStatus.finish === STATUS.COMPLETED
          ? uploadStatus.allDocsSearchable === true
            ? STATUS.COMPLETED
            : STATUS.STARTED
          : stepsStatus.finish
      ),
    },
  ];

  return (
    <EuiSteps data-test-subj="fileUploadLiteLookupSteps" steps={steps} titleSize="xxs" css={css} />
  );
};

function generateStatus(status: STATUS): EuiStepStatus {
  if (status === STATUS.STARTED) {
    return 'current';
  } else if (status === STATUS.FAILED || status === STATUS.ABORTED) {
    return 'danger';
  } else if (status === STATUS.COMPLETED) {
    return 'complete';
  } else {
    return 'incomplete';
  }
}
