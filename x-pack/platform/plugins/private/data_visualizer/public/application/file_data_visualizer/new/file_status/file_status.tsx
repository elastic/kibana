/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiPanel,
  EuiAccordion,
  EuiText,
  EuiButtonIcon,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IngestPipeline as IngestPipelineType } from '@kbn/file-upload-plugin/common';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { FileClashIcon, FileClashResult } from './file_clash';
import { Mappings } from './mappings';
import { IngestPipeline } from './pipeline';
import { UploadProgress } from './progress';
import { AnalysisOverrides } from './analysis_overrides';
import { FieldsStatsGrid } from '../../../common/components/fields_stats_grid';
import { FileContents } from './file_contents';
import { FileCouldNotBeRead, FileTooLarge } from './file_error_callouts';
import { Failures } from './failures';
import { AnalysisExplanation } from './analysis_explanation';

enum TAB {
  SUMMARY,
  STATS,
  CONTENT,
  PREVIEW,
  MAPPINGS,
  PIPELINE,
  EXPLANATION,
}

interface Props {
  index: number;
  showFileContentPreview?: boolean;
  showFileSummary?: boolean;
  lite: boolean;
  showOverrideButton?: boolean;
}

export const FileStatus: FC<Props> = ({
  lite,
  index,
  showFileContentPreview,
  showFileSummary,
  showOverrideButton = false,
}) => {
  const { deleteFile, uploadStatus, filesStatus, fileUploadManager, pipelines } =
    useFileUploadContext();

  const fileStatus = filesStatus[index];
  const fileClash = uploadStatus.fileClashes[index] ?? {
    clash: false,
  };

  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.PREVIEW);
  const [expanded, setExpanded] = useState<boolean>(false);

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED ||
    uploadStatus.overallImportStatus === STATUS.FAILED;

  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  useEffect(() => {
    if (
      fileStatus.analysisError !== undefined ||
      fileStatus.fileTooLarge ||
      (filesStatus.length === 1 && fileStatus.results !== null)
    ) {
      setExpanded(true);
    }
  }, [fileStatus, filesStatus.length]);

  const showResults =
    fileStatus.results !== null &&
    fileStatus.analysisError === undefined &&
    fileStatus.fileTooLarge === false;

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s">
        {importStarted ? (
          <>
            <UploadProgress fileStatus={fileStatus} />
            {fileStatus.failures.length > 0 ? (
              <>
                <EuiSpacer size="s" />
                <Failures docCount={fileStatus.docCount} failedDocs={fileStatus.failures} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <EuiAccordion
              id="accordion1"
              isDisabled={fileStatus.results === null && fileStatus.analysisError === undefined}
              forceState={expanded ? 'open' : 'closed'}
              onToggle={() => setExpanded(!expanded)}
              buttonProps={{ css: buttonCss }}
              buttonContent={
                <>
                  <EuiText size="xs">
                    <EuiFlexGroup gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <span css={{ fontWeight: 'bold' }}>{fileStatus.fileName}</span>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <span>{fileStatus.fileSizeInfo.fileSizeFormatted}</span>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <FileClashIcon fileClash={fileClash} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiText>
                </>
              }
              extraAction={
                <>
                  <AnalysisExplanation fileStatus={fileStatus} />

                  <AnalysisOverrides
                    fileStatus={fileStatus}
                    analyzeFileWithOverrides={fileUploadManager.analyzeFileWithOverrides(index)}
                  />
                  <EuiButtonIcon
                    onClick={() => deleteFile(index)}
                    iconType="trash"
                    size="xs"
                    color="danger"
                    aria-label={i18n.translate('xpack.dataVisualizer.file.fileStatus.deleteFile', {
                      defaultMessage: 'Remove file',
                    })}
                  />
                </>
              }
              paddingSize="s"
            >
              {showResults ? (
                <>
                  <FileClashResult fileClash={fileClash} />

                  <EuiTabs size="s">
                    {(lite && showFileContentPreview) || lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.PREVIEW}
                        onClick={() => setSelectedTab(TAB.PREVIEW)}
                        data-test-subj="mlFileUploadFileStatusPreviewTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.previewTabTitle"
                          defaultMessage="Preview"
                        />
                      </EuiTab>
                    ) : null}

                    {lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.STATS}
                        onClick={() => setSelectedTab(TAB.STATS)}
                        data-test-subj="mlFileUploadFileStatusStatsTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.statsTabTitle"
                          defaultMessage="Field statistics"
                        />
                      </EuiTab>
                    ) : null}

                    {lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.MAPPINGS}
                        onClick={() => setSelectedTab(TAB.MAPPINGS)}
                        data-test-subj="mlFileUploadFileStatusMappingsTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.mappingsTabTitle"
                          defaultMessage="Mappings"
                        />
                      </EuiTab>
                    ) : null}
                    {lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.PIPELINE}
                        onClick={() => setSelectedTab(TAB.PIPELINE)}
                        data-test-subj="mlFileUploadFileStatusPipelineTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.pipelineTabTitle"
                          defaultMessage="Pipeline"
                        />
                      </EuiTab>
                    ) : null}
                  </EuiTabs>
                  <EuiSpacer size="s" />

                  {selectedTab === TAB.PREVIEW ? (
                    <FileContents
                      fileContents={fileStatus.fileContents}
                      results={fileStatus.results!}
                      showTitle={false}
                    />
                  ) : null}

                  {selectedTab === TAB.STATS ? (
                    <FieldsStatsGrid results={fileStatus.results!} />
                  ) : null}

                  {selectedTab === TAB.MAPPINGS ? (
                    <Mappings
                      mappings={fileStatus.results!.mappings as MappingTypeMapping}
                      showTitle={false}
                      readonly={true}
                    />
                  ) : null}

                  {selectedTab === TAB.PIPELINE && pipelines[index] !== undefined ? (
                    <IngestPipeline
                      pipeline={pipelines[index] as IngestPipelineType}
                      showTitle={false}
                      setPipeline={fileUploadManager.updatePipeline(index)}
                    />
                  ) : null}
                </>
              ) : null}

              {fileStatus.analysisError ? (
                <>
                  <FileCouldNotBeRead
                    error={fileStatus.analysisError}
                    loaded={false}
                    showEditFlyout={() => {}}
                  />
                  {showOverrideButton ? (
                    <AnalysisOverrides
                      fileStatus={fileStatus}
                      analyzeFileWithOverrides={fileUploadManager.analyzeFileWithOverrides(index)}
                    />
                  ) : null}
                </>
              ) : null}

              {fileStatus.fileTooLarge ? (
                <>
                  <FileTooLarge fileStatus={fileStatus} />{' '}
                </>
              ) : null}
            </EuiAccordion>
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
