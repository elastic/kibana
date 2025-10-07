/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiCallOut,
} from '@elastic/eui';

import { type FindFileStructureResponse } from '@kbn/file-upload-common';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import { FILE_FORMATS } from '@kbn/file-upload-common';
import { TIKA_PREVIEW_CHARS } from '@kbn/file-upload-common';
import { EDITOR_MODE, JsonEditor } from '../json_editor';
import { useGrokHighlighter } from './use_text_parser';
import { LINE_LIMIT } from './grok_highlighter';

interface Props {
  fileContents: string;
  results: FindFileStructureResponse;
  showTitle?: boolean;
  disableHighlighting?: boolean;
  index: number;
}

interface SemiStructureTextData {
  grokPattern?: string;
  multilineStartPattern?: string;
  excludeLinesPattern?: string;
  sampleStart: string;
  ecsCompatibility?: string;
}

function semiStructureTextDataGuard(
  semiStructureTextData: SemiStructureTextData | null
): semiStructureTextData is SemiStructureTextData {
  return (
    semiStructureTextData !== null &&
    semiStructureTextData.grokPattern !== undefined &&
    semiStructureTextData.multilineStartPattern !== undefined
  );
}

export const FileContents: FC<Props> = ({
  fileContents,
  results,
  showTitle = true,
  disableHighlighting = false,
  index,
}) => {
  let mode = EDITOR_MODE.TEXT;
  const format = results.format;
  const numberOfLines = results.num_lines_analyzed;

  if (format === EDITOR_MODE.JSON) {
    mode = EDITOR_MODE.JSON;
  }
  const isMounted = useMountedState();
  const grokHighlighter = useGrokHighlighter();

  const semiStructureTextData = useMemo(
    () =>
      results.format === FILE_FORMATS.SEMI_STRUCTURED_TEXT
        ? {
            grokPattern: results.grok_pattern,
            multilineStartPattern: results.multiline_start_pattern,
            sampleStart: results.sample_start,
            excludeLinesPattern: results.exclude_lines_pattern,
            mappings: results.mappings,
            ecsCompatibility: results.ecs_compatibility,
          }
        : null,
    [results]
  );

  const [isSemiStructureTextData, setIsSemiStructureTextData] = useState(
    disableHighlighting === false && semiStructureTextDataGuard(semiStructureTextData)
  );
  const formattedData = useMemo(
    () => limitByNumberOfLines(fileContents, numberOfLines),
    [fileContents, numberOfLines]
  );

  const [highlightedLines, setHighlightedLines] = useState<JSX.Element[] | null>(null);
  const [showHighlights, setShowHighlights] = useState<boolean>(isSemiStructureTextData);

  useEffect(() => {
    if (isSemiStructureTextData === false || semiStructureTextData === null) {
      return;
    }
    const { grokPattern, multilineStartPattern, excludeLinesPattern, mappings, ecsCompatibility } =
      semiStructureTextData;

    grokHighlighter(
      fileContents,
      grokPattern!,
      mappings,
      ecsCompatibility,
      multilineStartPattern!,
      excludeLinesPattern
    )
      .then((docs) => {
        if (isMounted()) {
          setHighlightedLines(docs);
        }
      })
      .catch((e) => {
        if (isMounted()) {
          setHighlightedLines(null);
          setIsSemiStructureTextData(false);
        }
      });
  }, [fileContents, semiStructureTextData, grokHighlighter, isSemiStructureTextData, isMounted]);

  return (
    <>
      <EuiFlexGroup data-test-subj={`dataVisualizerFileContentsPanel_${index}`}>
        <EuiFlexItem>
          {showTitle ? (
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.fileContents.fileContentsTitle"
                  defaultMessage="File contents"
                />
              </h2>
            </EuiTitle>
          ) : null}
        </EuiFlexItem>
        {isSemiStructureTextData ? (
          <EuiFlexItem grow={false} data-test-subj="dataVisualizerFileContentsHighlightingSwitch">
            <EuiSwitch
              label={i18n.translate('xpack.dataVisualizer.file.fileContents.highlightSwitch', {
                defaultMessage: 'Grok pattern highlighting',
              })}
              compressed
              checked={showHighlights}
              onChange={() => setShowHighlights(!showHighlights)}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <PreviewLimitMessage wrapInCallout={showTitle === false}>
        {format === FILE_FORMATS.TIKA ? (
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileContents.characterCount"
            defaultMessage="Preview limited to the first {numberOfChars} characters"
            values={{
              numberOfChars: TIKA_PREVIEW_CHARS,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileContents.firstLinesDescription"
            defaultMessage="First {numberOfLines, plural, zero {# line} one {# line} other {# lines}}"
            values={{
              numberOfLines: showHighlights ? LINE_LIMIT : numberOfLines,
            }}
          />
        )}
      </PreviewLimitMessage>

      <EuiSpacer size="s" />

      {highlightedLines === null || showHighlights === false ? (
        <JsonEditor mode={mode} readOnly={true} value={formattedData} height="200px" />
      ) : (
        <>
          {highlightedLines.map((line, i) => (
            <React.Fragment key={`line-${i}`}>
              {line}
              {i === highlightedLines.length - 1 ? null : <EuiHorizontalRule margin="s" />}
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );
};

const PreviewLimitMessage: FC<PropsWithChildren<{ wrapInCallout?: boolean }>> = ({
  wrapInCallout = false,
  children,
}) => {
  return wrapInCallout ? (
    <EuiCallOut announceOnMount size="s" color="primary" title={children} />
  ) : (
    <>
      <EuiSpacer size="s" />
      {children}
    </>
  );
};

function limitByNumberOfLines(data: string, numberOfLines: number) {
  return data.split('\n').slice(0, numberOfLines).join('\n');
}
