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
import { CLASH_ERROR_TYPE } from '../file_manager/merge_tools';

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

export const FileStatusLite: FC<Props> = ({
  fileStatus,
  uploadStatus,
  deleteFile,
  index,
  showFileContentPreview = false,
  showFileSummary = false,
}) => {
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
              {showFileContentPreview || showFileSummary ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType={expanded ? 'arrowDown' : 'arrowRight'}
                    aria-label="expand"
                    onClick={() => setExpanded(!expanded)}
                  />
                </EuiFlexItem>
              ) : null}
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
                  {showFileContentPreview ? (
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

                  {showFileContentPreview ? (
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
                </EuiTabs>
                <EuiSpacer size="s" />

                {selectedTab === TAB.SUMMARY ? (
                  <AnalysisSummary results={fileStatus.results!} showTitle={false} />
                ) : null}

                {selectedTab === TAB.CONTENT ? (
                  <FileContents
                    fileContents={fileStatus.fileContents}
                    results={fileStatus.results!}
                    showTitle={false}
                    disableHighlighting={true}
                  />
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
