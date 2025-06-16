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
  EuiProgress,
  EuiHorizontalRule,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type UploadStatus, type FileAnalysis, CLASH_TYPE } from '@kbn/file-upload';
import { STATUS } from '@kbn/file-upload';
import { AnalysisSummary } from '../application/file_data_visualizer/components/analysis_summary';
import { FileContents } from '../application/file_data_visualizer/components/file_contents';

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
  CONTENT,
}

export const FileStatus: FC<Props> = ({
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
  const [selectedTab, setSelectedTab] = useState<TAB>(showFileSummary ? TAB.SUMMARY : TAB.CONTENT);

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;
  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="s"
        color={fileClash.clash ? 'danger' : 'transparent'}
      >
        {importStarted ? (
          <>
            <EuiProgress
              value={Math.floor(fileStatus.importProgress)}
              max={100}
              size="s"
              label={fileStatus.fileName}
              valueText={true}
              color={fileStatus.importProgress === 100 ? 'success' : 'primary'}
            />
          </>
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
                      <span css={{ fontWeight: 'bold' }}>{fileStatus.fileName}</span>&nbsp;
                      <span>{fileStatus.fileSizeInfo.fileSizeFormatted}</span>
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

            {fileClash.clash ? (
              <>
                {fileClash.clashType === CLASH_TYPE.FORMAT ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.fileStatus.fileFormatClash"
                        defaultMessage="File format different from other files"
                      />
                    </EuiText>
                  </>
                ) : null}

                {fileClash.clashType === CLASH_TYPE.MAPPING ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.fileStatus.mappingClash"
                        defaultMessage="Mappings incompatible with other files"
                      />
                    </EuiText>
                  </>
                ) : null}

                {fileClash.clashType === CLASH_TYPE.UNSUPPORTED ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.fileStatus.fileFormatNotSupported"
                        defaultMessage="File format not supported"
                      />
                    </EuiText>
                  </>
                ) : null}
              </>
            ) : null}

            {expanded ? (
              <>
                <EuiHorizontalRule margin="s" />
                <EuiTabs size="s">
                  {showFileContentPreview && showFileSummary ? (
                    <>
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
                        isSelected={selectedTab === TAB.CONTENT}
                        onClick={() => setSelectedTab(TAB.CONTENT)}
                        data-test-subj="mlNodesOverviewPanelMemoryTab"
                      >
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.fileStatus.contentTabTitle"
                          defaultMessage="Content"
                        />
                      </EuiTab>
                    </>
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
