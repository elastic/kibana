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
  EuiTab,
  EuiTabs,
  EuiAccordion,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { STATUS } from '../file_manager/file_manager';
import { FileClashResult } from './file_clash';
import { UploadProgress } from './progress';
import { AnalysisSummary } from '../../application/file_data_visualizer/components/analysis_summary';
import { FileContents } from '../../application/file_data_visualizer/components/file_contents';
import { FieldsStatsGrid } from '../../application/common/components/fields_stats_grid';
import { Mappings } from './mappings';
// import { CLASH_ERROR_TYPE } from '../file_manager/merge_tools';
import { IngestPipeline } from './pipeline';
import type { FileStatusProps } from './file_status';

enum TAB {
  SUMMARY,
  STATS,
  CONTENT,
  MAPPINGS,
  PIPELINE,
}

export const FileStatusFull: FC<FileStatusProps> = ({
  fileStatus,
  uploadStatus,
  deleteFile,
  setPipeline,
  index,
}) => {
  const fileClash = uploadStatus.fileClashes[index] ?? {
    clash: false,
  };

  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.SUMMARY);

  const importStarted =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    uploadStatus.overallImportStatus === STATUS.COMPLETED;

  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s">
        {importStarted ? (
          <UploadProgress fileStatus={fileStatus} />
        ) : (
          <>
            <EuiAccordion
              id="accordion1"
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
                    <Mappings
                      mappings={fileStatus.results!.mappings as MappingTypeMapping}
                      showTitle={false}
                      readonly={true}
                    />
                  ) : null}

                  {selectedTab === TAB.PIPELINE ? (
                    <IngestPipeline
                      fileStatus={fileStatus}
                      showTitle={false}
                      setPipeline={setPipeline}
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
