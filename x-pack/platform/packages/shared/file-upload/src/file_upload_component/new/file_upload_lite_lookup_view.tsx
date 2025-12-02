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
import React, { useCallback, useEffect, useMemo } from 'react';
import { type OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { GetAdditionalLinks, ResultLinks } from '@kbn/file-upload-common';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { STATUS, useFileUploadContext } from '../../..';
import { FileClashWarning } from './file_clash_warning';
import { FileStatus } from './file_status';
import { MappingEditor } from './mapping_editor';
import { MappingEditorService } from './mapping_editor/mapping_editor_service';

interface Props {
  resultLinks?: ResultLinks;
  getAdditionalLinks?: GetAdditionalLinks;
  props: OpenFileUploadLiteContext;
  onClose?: () => void;
  setIsSaving: (saving: boolean) => void;
  setDropzoneDisabled?: (disabled: boolean) => void;
}

interface StepsStatus {
  analysis: STATUS;
  mapping: STATUS;
  upload: STATUS;
  finish: STATUS;
}

export const FileUploadLiteLookUpView: FC<Props> = ({
  props,
  onClose,
  setIsSaving,
  setDropzoneDisabled,
}) => {
  const { flyoutContent } = props;
  const { fileUploadManager, filesStatus, uploadStatus, fileClashes, onImportClick, indexName } =
    useFileUploadContext();

  const mappingEditorService = useMemo(
    () => new MappingEditorService(fileUploadManager),
    [fileUploadManager]
  );

  const mappingsValid = useObservable(
    mappingEditorService.mappingsValid$,
    mappingEditorService.getMappingsValid()
  );

  const [stepsStatus, setStepsStatus] = React.useState<StepsStatus>({
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

  if (indexName === null) {
    return null;
  }

  const css = {
    '.euiStep__content': { paddingBlockEnd: '0px' },
  };

  const steps: EuiContainedStepProps[] = [
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.analysis', {
        defaultMessage: 'Analysis ',
      }),
      children:
        stepsStatus.analysis === STATUS.STARTED ? (
          <>
            {filesStatus.map((status, i) => (
              <FileStatus
                key={i}
                index={i}
                lite={true}
                showFileContentPreview={flyoutContent?.showFileContentPreview}
                showOverrideButton={false}
                showExplanationButton={false}
                showSettingsButton={false}
                showFileContents={true}
              />
            ))}

            {fileClashes ? <FileClashWarning /> : null}

            <EuiSpacer />

            <EuiButton
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
      status: generateStatus([stepsStatus.analysis]),
    },
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.reviewMapping', {
        defaultMessage: 'Review mapping',
      }),
      children:
        stepsStatus.mapping === STATUS.STARTED ? (
          <>
            <MappingEditor mappingEditorService={mappingEditorService} />

            <EuiSpacer />

            <EuiButton
              disabled={!mappingsValid}
              onClick={() => {
                setIsSaving(true);
                onImportClick();
                setStep('mapping', STATUS.COMPLETED);
                setStep('upload', STATUS.STARTED);
              }}
            >
              <FormattedMessage id="xpack.fileUpload.import" defaultMessage="Import" />
            </EuiButton>

            <EuiSpacer />
          </>
        ) : null,
      status: generateStatus([stepsStatus.mapping]),
    },
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.uploadingFilesToIndex', {
        defaultMessage: 'Uploading files to index { indexName }',
        values: { indexName },
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
      status: generateStatus([uploadStatus.overallImportStatus]),
    },
    {
      title: i18n.translate('xpack.fileUpload.lookupJoinUpload.finish', {
        defaultMessage: 'Finalizing',
      }),
      children:
        stepsStatus.finish === STATUS.COMPLETED ? (
          <>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.fileUpload.lookupJoinUpload.finishMessage"
                defaultMessage="Your files have been successfully uploaded."
              />
            </EuiText>

            <EuiSpacer />

            <EuiButton
              disabled={uploadStatus.allDocsSearchable === false}
              onClick={() => {
                setIsSaving(false);
                onClose?.();
              }}
            >
              <FormattedMessage id="xpack.fileUpload.continue" defaultMessage="Finish" />
            </EuiButton>
          </>
        ) : null,
      status: generateStatus([stepsStatus.finish]),
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
