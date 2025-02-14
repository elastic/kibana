/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { ResultLinks } from '../../common/app';
import type { GetAdditionalLinks } from '../application/common/components/results_links';
import { FileClashWarning } from './file_clash_warning';
import { FileManager } from './file_manager';
import { STATUS } from './file_manager/file_manager';
import { FilePicker } from './file_picker';
import { FileStatus } from './file_status';
import { IndexInput } from './index_input';
import { OverallUploadStatus } from './overall_upload_status';
import { ImportErrors } from './import_errors';
import { DataViewIllustration } from './data_view_illustration';

interface Props {
  dataStart: DataPublicPluginStart;
  http: HttpSetup;
  fileUpload: FileUploadStartApi;
  resultLinks?: ResultLinks;
  capabilities: ApplicationStart['capabilities'];
  getAdditionalLinks?: GetAdditionalLinks;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddInference?: string;
  autoCreateDataView?: boolean;
  indexSettings?: IndicesIndexSettings;
  onClose?: () => void;
}

export const FileUploadLiteView: FC<Props> = ({
  fileUpload,
  http,
  dataStart,
  setUploadResults,
  autoAddInference,
  autoCreateDataView,
  indexSettings,
  onClose,
}) => {
  const [indexName, setIndexName] = useState<string>('');
  const [indexValidationStatus, setIndexValidationStatus] = useState<STATUS>(STATUS.NOT_STARTED);

  const fm = useMemo(
    () =>
      new FileManager(
        fileUpload,
        http,
        dataStart.dataViews,
        autoAddInference ?? null,
        autoCreateDataView,
        true,
        indexSettings
      ),
    [autoAddInference, autoCreateDataView, dataStart.dataViews, fileUpload, http, indexSettings]
  );
  const deleteFile = useCallback((i: number) => fm.removeFile(i), [fm]);

  const filesStatus = useObservable(fm.fileAnalysisStatus$, []);
  const uploadStatus = useObservable(fm.uploadStatus$, fm.uploadStatus$.getValue());
  const fileClashes = useMemo(
    () => uploadStatus.fileClashes.some((f) => f.clash),
    [uploadStatus.fileClashes]
  );

  useEffect(() => {
    return () => {
      fm.destroy();
    };
  }, [fm]);

  const uploadInProgress =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED ||
    uploadStatus.overallImportStatus === STATUS.FAILED;

  const onImportClick = useCallback(() => {
    fm.import(indexName).then((res) => {
      if (setUploadResults && res) {
        setUploadResults(res);
      }
    });
  }, [fm, indexName, setUploadResults]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.dataVisualizer.file.uploadView.uploadFileTitle"
              defaultMessage="Upload a file"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <>
          <>
            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
              <>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.uploadView.uploadFileDescription"
                      defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index. The data can also be automatically vectorized using semantic text."
                    />
                  </p>
                </EuiText>

                <EuiSpacer />

                <FilePicker fileManager={fm} />
              </>
            ) : null}

            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
              <>
                {filesStatus.map((status, i) => (
                  <FileStatus
                    uploadStatus={uploadStatus}
                    fileStatus={status}
                    key={i}
                    deleteFile={() => deleteFile(i)}
                    index={i}
                  />
                ))}

                {fileClashes ? (
                  <FileClashWarning
                    uploadStatus={uploadStatus}
                    filesStatus={filesStatus}
                    removeClashingFiles={() => fm.removeClashingFiles()}
                  />
                ) : null}
                <EuiSpacer />
              </>
            ) : null}

            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED &&
            filesStatus.length > 0 &&
            uploadStatus.analysisOk ? (
              <>
                <IndexInput
                  setIndexName={setIndexName}
                  setIndexValidationStatus={setIndexValidationStatus}
                  fileUpload={fileUpload}
                />
              </>
            ) : null}
            {uploadInProgress ? (
              <>
                <EuiFlexGroup>
                  <EuiFlexItem />
                  <EuiFlexItem grow={false}>
                    <DataViewIllustration />
                  </EuiFlexItem>
                  <EuiFlexItem />
                </EuiFlexGroup>

                <EuiSpacer size="xl" />

                <OverallUploadStatus uploadStatus={uploadStatus} filesStatus={filesStatus} />

                {uploadStatus.overallImportStatus === STATUS.FAILED ? (
                  <ImportErrors uploadStatus={uploadStatus} />
                ) : null}
              </>
            ) : null}
          </>
        </>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.dataVisualizer.file.uploadView.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            {uploadStatus.overallImportStatus === STATUS.STARTED ? (
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty onClick={onClose} disabled={true}>
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.uploadView.importingButton"
                      defaultMessage="Importing"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED ? (
              <EuiButton
                disabled={indexName === '' || indexValidationStatus !== STATUS.COMPLETED}
                onClick={onImportClick}
              >
                <FormattedMessage
                  id="xpack.dataVisualizer.file.uploadView.importButton"
                  defaultMessage="Import"
                />
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
