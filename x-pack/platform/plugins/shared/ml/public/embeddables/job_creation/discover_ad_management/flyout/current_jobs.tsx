/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLoadingSpinner, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useMlApi } from '../../../../application/contexts/kibana';

interface Props {
  indexPattern: string;
}

/** The jobs whose datafeed reads an index which is, or together make up, the index pattern. */
export const filterJobsByIndex = (jobs: MlSummaryJob[], indexPattern: string): MlSummaryJob[] =>
  jobs.filter(
    ({ datafeedIndices }) =>
      datafeedIndices.includes(indexPattern) || datafeedIndices.join(',') === indexPattern
  );

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; jobs: MlSummaryJob[] };

export const CurrentJobs: FC<Props> = ({ indexPattern }) => {
  const mlApi = useMlApi();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let isCurrent = true;
    setState({ status: 'loading' });
    mlApi.jobs
      .jobsSummary([])
      .then((jobs) => {
        if (isCurrent) setState({ status: 'loaded', jobs: filterJobsByIndex(jobs, indexPattern) });
      })
      .catch((error) => {
        if (isCurrent) setState({ status: 'error', message: extractErrorMessage(error) });
      });
    return () => {
      isCurrent = false;
    };
  }, [mlApi, indexPattern]);

  return (
    <div data-test-subj="mlDiscoverADManagementCurrentJobs">
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.ml.discoverADManagementFlyout.currentJobsDescription"
          defaultMessage="Jobs which match {indexPattern}"
          values={{ indexPattern: <strong>{indexPattern}</strong> }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      {state.status === 'loading' && <EuiLoadingSpinner size="l" />}
      {state.status === 'error' && (
        <KbnDangerCallout
          title={i18n.translate('xpack.ml.discoverADManagementFlyout.currentJobsError', {
            defaultMessage: 'The jobs could not be loaded',
          })}
          text={state.message}
        />
      )}
      {state.status === 'loaded' && state.jobs.length === 0 && (
        <EuiText size="s" data-test-subj="mlDiscoverADManagementCurrentJobsEmpty">
          <FormattedMessage
            id="xpack.ml.discoverADManagementFlyout.currentJobsEmpty"
            defaultMessage="There are no jobs for this data yet."
          />
        </EuiText>
      )}
      {state.status === 'loaded' &&
        state.jobs.map(({ id, description }) => (
          <React.Fragment key={id}>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="m"
              data-test-subj={`mlDiscoverADManagementCurrentJob-${id}`}
            >
              <EuiText size="s">
                <strong>{id}</strong>
              </EuiText>
              {description ? (
                <EuiText size="s" color="subdued">
                  {description}
                </EuiText>
              ) : null}
            </EuiPanel>
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
    </div>
  );
};
