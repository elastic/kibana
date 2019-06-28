/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import {
  EuiTabbedContent,
  EuiButton,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';

import { FileContents } from '../file_contents';
import { AnalysisSummary } from '../analysis_summary';
import { FieldsStats } from '../fields_stats';

export const ResultsView = injectI18n(function ({ data, results, showEditFlyout, intl }) {

  console.log(results);

  const tabs = [
    {
      id: 'file-stats',
      name: intl.formatMessage({
        id: 'xpack.ml.fileDatavisualizer.resultsView.fileStatsTabName',
        defaultMessage: 'File stats'
      }),
      content: <FieldsStats results={results} />,
    }
  ];

  return (
    <div className="results">
      <EuiPanel>
        <FileContents
          data={data}
          format={results.format}
          numberOfLines={results.num_lines_analyzed}
        />
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel>
        <AnalysisSummary
          results={results}
        />

        <EuiSpacer size="m" />

        <EuiButton onClick={() => showEditFlyout()}>
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.resultsView.overrideSettingsButtonLabel"
            defaultMessage="Override settings"
          />
        </EuiButton>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel>
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          onTabClick={() => { }}
        />
      </EuiPanel>

    </div>
  );
});
