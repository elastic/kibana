/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import { EuiFlexItem, EuiCode, EuiFlexGrid } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import { FILE_FORMATS } from '@kbn/file-upload-common';
import { getTikaDisplayType } from '@kbn/file-upload/file_upload_manager';

interface Props {
  results: FindFileStructureResponse;
}

export const AnalysisSummary: FC<Props> = ({ results }) => {
  return (
    <EuiFlexGrid columns={2}>
      <EuiFlexItem>
        <p>
          <FormattedMessage
            id="xpack.dataVisualizer.file.analysisSummary.analyzedLinesNumberTitle"
            defaultMessage="Number of lines analyzed {code}"
            values={{
              code: <EuiCode>{results.num_lines_analyzed}</EuiCode>,
            }}
          />
        </p>
      </EuiFlexItem>
      {results.format !== undefined ? (
        <EuiFlexItem>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.file.analysisSummary.formatTitle"
              defaultMessage="Format {code}"
              values={{
                code: <EuiCode>{getFormatLabel(results)}</EuiCode>,
              }}
            />
          </p>
        </EuiFlexItem>
      ) : null}

      {results.format === FILE_FORMATS.DELIMITED ? (
        <>
          <EuiFlexItem>
            <p>
              <FormattedMessage
                id="xpack.dataVisualizer.file.analysisSummary.delimiterTitle"
                defaultMessage="Delimiter {code}"
                values={{
                  code: <EuiCode>{results.delimiter}</EuiCode>,
                }}
              />
            </p>
          </EuiFlexItem>

          <EuiFlexItem>
            <p>
              <FormattedMessage
                id="xpack.dataVisualizer.file.analysisSummary.hasHeaderRowTitle"
                defaultMessage="Has header row {code}"
                values={{
                  code: <EuiCode>{`${results.has_header_row}`}</EuiCode>,
                }}
              />
            </p>
          </EuiFlexItem>
        </>
      ) : null}

      {results.grok_pattern !== undefined ? (
        <EuiFlexItem>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.file.analysisSummary.grokPatternTitle"
              defaultMessage="Grok pattern {code}"
              values={{
                code: <EuiCode>{results.grok_pattern}</EuiCode>,
              }}
            />
          </p>
        </EuiFlexItem>
      ) : null}

      {results.timestamp_field !== undefined ? (
        <EuiFlexItem>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.file.analysisSummary.timeFieldTitle"
              defaultMessage="Time field {code}"
              values={{
                code: <EuiCode>{results.timestamp_field}</EuiCode>,
              }}
            />
          </p>
        </EuiFlexItem>
      ) : null}

      {results.java_timestamp_formats !== undefined ? (
        <EuiFlexItem>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.file.analysisSummary.timeFormatTitle"
              defaultMessage="Time {timestampFormats, plural, zero {format} one {format} other {formats}} {code}"
              values={{
                timestampFormats: results.java_timestamp_formats.length,
                code: <EuiCode>{results.java_timestamp_formats.join(', ')}</EuiCode>,
              }}
            />
          </p>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGrid>
  );
};

function getFormatLabel(results: FindFileStructureResponse) {
  return results.format === FILE_FORMATS.TIKA && results.document_type !== undefined
    ? getTikaDisplayType(results.document_type).label
    : results.format;
}
