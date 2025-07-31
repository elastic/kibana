/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';

import type { FC } from 'react';
import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';

import { FILE_FORMATS } from '@kbn/file-upload-common';
import { FileContents } from '../file_contents';
import { AnalysisSummary } from '../analysis_summary';
import { FieldsStatsGrid } from '../../../common/components/fields_stats_grid';
import { MODE as DATAVISUALIZER_MODE } from '../file_data_visualizer_view/constants';

interface Props {
  fileContents: string;
  data: ArrayBuffer;
  fileName: string;
  results: FindFileStructureResponse;
  showEditFlyout(): void;
  showExplanationFlyout(): void;
  disableButtons: boolean;
  onChangeMode: (mode: DATAVISUALIZER_MODE) => void;
  onCancel: () => void;
  disableImport?: boolean;
}

export const ResultsView: FC<Props> = ({
  fileContents,
  fileName,
  results,
  showEditFlyout,
  showExplanationFlyout,
  disableButtons,
  onChangeMode,
  onCancel,
  disableImport,
}) => {
  return (
    <EuiPageBody data-test-subj="dataVisualizerPageFileResults">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 data-test-subj="dataVisualizerFileResultsTitle">{fileName}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onCancel}
            data-test-subj="dataVisualizerFileResultsCancelButton"
            size="s"
          >
            <FormattedMessage
              id="xpack.dataVisualizer.file.resultsView.cancelButtonLabel"
              defaultMessage="Select a different file"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <div>
        <EuiPanel data-test-subj="dataVisualizerFileFileContentPanel" hasShadow={false} hasBorder>
          <FileContents fileContents={fileContents} results={results} />
        </EuiPanel>

        <EuiSpacer size="m" />

        <EuiPanel data-test-subj="dataVisualizerFileSummaryPanel" hasShadow={false} hasBorder>
          <AnalysisSummary results={results} />

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={disableImport}
                onClick={() => onChangeMode(DATAVISUALIZER_MODE.IMPORT)}
                data-test-subj="dataVisualizerFileOpenImportPageButton"
              >
                <FormattedMessage
                  id="xpack.dataVisualizer.file.resultsView.importButtonLabel"
                  defaultMessage="Import"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => showEditFlyout()} disabled={disableButtons}>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.resultsView.overrideSettingsButtonLabel"
                  defaultMessage="Override settings"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {results.format !== FILE_FORMATS.TIKA ? (
                <EuiButtonEmpty onClick={() => showExplanationFlyout()} disabled={disableButtons}>
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.resultsView.analysisExplanationButtonLabel"
                    defaultMessage="Analysis explanation"
                  />
                </EuiButtonEmpty>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        {results.format !== FILE_FORMATS.TIKA ? (
          <>
            <EuiSpacer size="m" />

            <EuiPanel data-test-subj="dataVisualizerFileFileStatsPanel" hasShadow={false} hasBorder>
              <EuiTitle size="s">
                <h2 data-test-subj="dataVisualizerFileStatsTitle">
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.resultsView.fileStatsName"
                    defaultMessage="File stats"
                  />
                </h2>
              </EuiTitle>

              <FieldsStatsGrid results={results} />
            </EuiPanel>
          </>
        ) : null}
      </div>
    </EuiPageBody>
  );
};
