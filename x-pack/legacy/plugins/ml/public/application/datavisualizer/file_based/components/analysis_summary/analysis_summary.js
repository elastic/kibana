/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { EuiTitle, EuiSpacer, EuiDescriptionList } from '@elastic/eui';

export function AnalysisSummary({ results }) {
  const items = createDisplayItems(results);

  return (
    <React.Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.analysisSummary.summaryTitle"
            defaultMessage="Summary"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiDescriptionList type="column" listItems={items} className="analysis-summary-list" />
    </React.Fragment>
  );
}

function createDisplayItems(results) {
  const items = [
    {
      title: (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.analysisSummary.analyzedLinesNumberTitle"
          defaultMessage="Number of lines analyzed"
        />
      ),
      description: results.num_lines_analyzed,
    },
    // {
    //   title: 'Charset',
    //   description: results.charset,
    // }
  ];

  if (results.format !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.analysisSummary.formatTitle"
          defaultMessage="Format"
        />
      ),
      description: results.format,
    });

    if (results.format === 'delimited') {
      items.push({
        title: (
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.analysisSummary.delimiterTitle"
            defaultMessage="Delimiter"
          />
        ),
        description: results.delimiter,
      });

      items.push({
        title: (
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.analysisSummary.hasHeaderRowTitle"
            defaultMessage="Has header row"
          />
        ),
        description: `${results.has_header_row}`,
      });
    }
  }

  if (results.grok_pattern !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.analysisSummary.grokPatternTitle"
          defaultMessage="Grok pattern"
        />
      ),
      description: results.grok_pattern,
    });
  }

  if (results.timestamp_field !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.analysisSummary.timeFieldTitle"
          defaultMessage="Time field"
        />
      ),
      description: results.timestamp_field,
    });
  }

  if (results.java_timestamp_formats !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.analysisSummary.timeFormatTitle"
          defaultMessage="Time {timestampFormats, plural, zero {format} one {format} other {formats}}"
          values={{
            timestampFormats: results.java_timestamp_formats.length,
          }}
        />
      ),
      description: results.java_timestamp_formats.join(', '),
    });
  }

  return items;
}
