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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IngestPipeline as IngestPipelineType } from '@kbn/file-upload-plugin/common';
import type { InputOverrides } from '@kbn/file-upload-plugin/common';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { STATUS, type UploadStatus } from '../file_manager/file_manager';
import { FieldsStatsGrid } from '../../application/common/components/fields_stats_grid';

import { FileContents } from '../../application/file_data_visualizer/components/file_contents';
import { FileCouldNotBeRead } from '../../application/file_data_visualizer/components/file_data_visualizer_view/file_error_callouts';
import { FileClashResult } from './file_clash';
import { Mappings } from './mappings';
import { IngestPipeline } from './pipeline';
import { UploadProgress } from './progress';
import { AnalysisExplanation } from './analysis_explanation';

import { AnalysisOverrides } from './analysis_overrides';
import { AnalysisSummary } from '../../application/file_data_visualizer/components/analysis_summary';

enum TAB {
  SUMMARY,
  STATS,
  CONTENT,
  MAPPINGS,
  PIPELINE,
  EXPLANATION,
}

interface Props {
  uploadStatus: UploadStatus;
  fileStatus: FileAnalysis;
  pipeline?: IngestPipelineType;
  deleteFile: () => void;
  index: number;
  setPipeline?: (pipeline: string) => void;
  showFileContentPreview?: boolean;
  showFileSummary?: boolean;
  lite: boolean;
  analyzeFileWithOverrides?: (overrides: InputOverrides) => void;
  autoExpand?: boolean;
}

export const FileStatus: FC<Props> = ({
  lite,
  uploadStatus,
  fileStatus,
  pipeline,
  deleteFile,
  index,
  showFileContentPreview,
  showFileSummary,
  setPipeline,
  analyzeFileWithOverrides,
  autoExpand = false,
}) => {
  const fileClash = uploadStatus.fileClashes[index] ?? {
    clash: false,
  };

  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.SUMMARY);
  const [expanded, setExpanded] = useState<boolean>(false);

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;

  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  useEffect(() => {
    if (fileStatus.analysisError !== undefined || (autoExpand && fileStatus.results !== null)) {
      setExpanded(true);
    }
  }, [autoExpand, fileStatus]);

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s">
        {importStarted ? (
          <UploadProgress fileStatus={fileStatus} />
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
                    <span css={{ fontWeight: 'bold' }}>{fileStatus.fileName}</span>{' '}
                    <span>{fileStatus.fileSize}</span>
                  </EuiText>

                  <FileClashResult fileClash={fileClash} />
                </>
              }
              extraAction={
                <EuiButtonIcon
                  onClick={deleteFile}
                  iconType="trash"
                  size="xs"
                  color="danger"
                  aria-label={i18n.translate('xpack.dataVisualizer.file.fileStatus.deleteFile', {
                    defaultMessage: 'Remove file',
                  })}
                />
              }
              paddingSize="s"
            >
              {fileStatus.results ? (
                <>
                  <EuiTabs size="s">
                    {(lite && showFileSummary) || lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.SUMMARY}
                        onClick={() => setSelectedTab(TAB.SUMMARY)}
                        data-test-subj="mlNodesOverviewPanelDetailsTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.summaryTabTitle"
                          defaultMessage="Summary"
                        />
                      </EuiTab>
                    ) : null}

                    {lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.STATS}
                        onClick={() => setSelectedTab(TAB.STATS)}
                        data-test-subj="mlNodesOverviewPanelMemoryTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.statsTabTitle"
                          defaultMessage="Stats"
                        />
                      </EuiTab>
                    ) : null}

                    {(lite && showFileContentPreview) || lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.CONTENT}
                        onClick={() => setSelectedTab(TAB.CONTENT)}
                        data-test-subj="mlNodesOverviewPanelMemoryTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.contentTabTitle"
                          defaultMessage="Content"
                        />
                      </EuiTab>
                    ) : null}

                    {lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.EXPLANATION}
                        onClick={() => setSelectedTab(TAB.EXPLANATION)}
                        data-test-subj="mlNodesOverviewPanelMemoryTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.contentTabTitle"
                          defaultMessage="Analysis explanation"
                        />
                      </EuiTab>
                    ) : null}

                    {lite === false ? (
                      <EuiTab
                        isSelected={selectedTab === TAB.MAPPINGS}
                        onClick={() => setSelectedTab(TAB.MAPPINGS)}
                        data-test-subj="mlNodesOverviewPanelMemoryTab"
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
                        data-test-subj="mlNodesOverviewPanelMemoryTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.pipelineTabTitle"
                          defaultMessage="Pipeline"
                        />
                      </EuiTab>
                    ) : null}
                  </EuiTabs>
                  <EuiSpacer size="s" />

                  {selectedTab === TAB.SUMMARY ? (
                    <>
                      <AnalysisSummary results={fileStatus.results!} showTitle={false} />

                      {analyzeFileWithOverrides ? (
                        <AnalysisOverrides
                          fileStatus={fileStatus}
                          analyzeFileWithOverrides={analyzeFileWithOverrides}
                        />
                      ) : null}
                    </>
                  ) : null}

                  {selectedTab === TAB.STATS ? (
                    <FieldsStatsGrid results={fileStatus.results!} />
                  ) : null}

                  {selectedTab === TAB.CONTENT ? (
                    <FileContents
                      fileContents={fileStatus.fileContents}
                      results={fileStatus.results!}
                      showTitle={false}
                    />
                  ) : null}

                  {selectedTab === TAB.EXPLANATION ? (
                    <AnalysisExplanation results={fileStatus.results!} />
                  ) : null}

                  {selectedTab === TAB.MAPPINGS ? (
                    <Mappings
                      mappings={fileStatus.results!.mappings as MappingTypeMapping}
                      showTitle={false}
                      readonly={true}
                    />
                  ) : null}

                  {selectedTab === TAB.PIPELINE && pipeline !== undefined ? (
                    <IngestPipeline
                      pipeline={pipeline}
                      showTitle={false}
                      setPipeline={setPipeline}
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
                  {analyzeFileWithOverrides ? (
                    <AnalysisOverrides
                      fileStatus={fileStatus}
                      analyzeFileWithOverrides={analyzeFileWithOverrides}
                    />
                  ) : null}
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
