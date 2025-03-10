/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FileAnalysis } from '../file_manager/file_wrapper';
import { STATUS, type UploadStatus } from '../file_manager/file_manager';
import { FileClashResult } from './file_clash';
import { UploadProgress } from './progress';
import { AnalysisSummary } from '../../application/file_data_visualizer/components/analysis_summary';
import { FileContents } from '../../application/file_data_visualizer/components/file_contents';
import { FieldsStatsGrid } from '../../application/common/components/fields_stats_grid';
import { Mappings } from './mappings';
import { CLASH_ERROR_TYPE } from '../file_manager/merge_tools';
import { IngestPipeline } from './pipeline';

interface Props {
  uploadStatus: UploadStatus;
  fileStatus: FileAnalysis;
  deleteFile: () => void;
  index: number;
  showFileContentPreview?: boolean;
  showFileSummary?: boolean;
}

enum TAB {
  SUMMARY,
  STATS,
  CONTENT,
  MAPPINGS,
  PIPELINE,
}

export const FileStatusFull: FC<Props> = ({ fileStatus, uploadStatus, deleteFile, index }) => {
  const fileClash = uploadStatus.fileClashes[index] ?? {
    clash: false,
  };

  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.SUMMARY);

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;

  const panelColor =
    fileClash.clash === CLASH_ERROR_TYPE.ERROR
      ? 'danger'
      : fileClash.clash === CLASH_ERROR_TYPE.WARNING
      ? 'warning'
      : 'transparent';

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s" color={panelColor}>
        {importStarted ? (
          <UploadProgress fileStatus={fileStatus} />
        ) : (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={expanded ? 'arrowDown' : 'arrowRight'}
                  aria-label="expand"
                  onClick={() => setExpanded(!expanded)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={8}>
                    <EuiText size="xs">
                      <span css={{ fontWeight: 'bold' }}>{fileStatus.fileName}</span>{' '}
                      <span>{fileStatus.fileSize}</span>
                    </EuiText>
                  </EuiFlexItem>

                  <EuiFlexItem grow={2}>
                    <EuiFlexGroup gutterSize="none">
                      <EuiFlexItem grow={true} />
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          onClick={deleteFile}
                          iconType="trash"
                          size="xs"
                          color="danger"
                          aria-label={i18n.translate(
                            'xpack.dataVisualizer.file.fileStatus.deleteFile',
                            {
                              defaultMessage: 'Remove file',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <FileClashResult fileClash={fileClash} />

            {expanded ? (
              <>
                <EuiHorizontalRule margin="s" />
                <EuiTabs size="s">
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
                </EuiTabs>
                <EuiSpacer size="s" />

                {selectedTab === TAB.SUMMARY ? (
                  <AnalysisSummary results={fileStatus.results!} showTitle={false} />
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

                {selectedTab === TAB.MAPPINGS ? (
                  <Mappings fileStatus={fileStatus} showTitle={false} />
                ) : null}

                {selectedTab === TAB.PIPELINE ? (
                  <IngestPipeline fileStatus={fileStatus} showTitle={false} />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
