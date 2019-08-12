/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import { useLogAnalysisResults } from '../../../containers/logs/log_analysis';
import { LoadingPage } from '../../../components/loading_page';

export const AnalysisResultsContent = ({ sourceId }: { sourceId: string }) => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_results' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_results', delay: 15000 });

  const { isLoading, logEntryRate, getLogEntryRate } = useLogAnalysisResults({ sourceId });

  return (
    <>
      {isLoading ? (
        <LoadingPage
          message={i18n.translate('xpack.infra.logs.logsAnalysisResults.loadingMessage', {
            defaultMessage: 'Loading results...',
          })}
        />
      ) : (
        <div>Results</div>
      )}
    </>
  );
};
