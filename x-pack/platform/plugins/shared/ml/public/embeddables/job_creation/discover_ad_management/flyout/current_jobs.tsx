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
import { EuiCheckableCard, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useMlApi } from '../../../../application/contexts/kibana';
import { filterJobsByIndex } from '../../../../application/components/job_suggestion/filter_jobs_by_index';
import {
  useSelectedJobId,
  useShowAnomalies,
} from '../../../../application/components/job_suggestion/use_selected_job_id';

interface Props {
  indexPattern: string;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; jobs: MlSummaryJob[] };

export const CurrentJobs: FC<Props> = ({ indexPattern }) => {
  const mlApi = useMlApi();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [selectedJobId, selectJob] = useSelectedJobId(indexPattern);
  const [, setShowAnomalies] = useShowAnomalies(indexPattern);
  // The anomalies of a job which is selected are shown, even when they were hidden for the previous one
  const selectAndShowJob = (jobId: string) => {
    selectJob(jobId);
    setShowAnomalies(true);
  };

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
      {state.status === 'loaded' && state.jobs.length > 0 && (
        <>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.ml.discoverADManagementFlyout.currentJobsSelectionDescription"
              defaultMessage="The results of the selected job are shown on the chart."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiCheckableCard
            id="mlDiscoverADManagementCurrentJobNone"
            name="mlDiscoverADManagementCurrentJob"
            label={i18n.translate('xpack.ml.discoverADManagementFlyout.noJobSelected', {
              defaultMessage: 'No job selected',
            })}
            checked={selectedJobId === undefined}
            onChange={() => selectJob(undefined)}
            data-test-subj="mlDiscoverADManagementCurrentJobRadioNone"
          />
          <EuiSpacer size="s" />
        </>
      )}
      {state.status === 'loaded' &&
        state.jobs.map(({ id, description }) => (
          <React.Fragment key={id}>
            <EuiCheckableCard
              id={`mlDiscoverADManagementCurrentJob-${id}`}
              name="mlDiscoverADManagementCurrentJob"
              label={
                <>
                  <EuiText size="s">
                    <strong>{id}</strong>
                  </EuiText>
                  {description ? (
                    <EuiText size="s" color="subdued">
                      {description}
                    </EuiText>
                  ) : null}
                </>
              }
              checked={selectedJobId === id}
              onChange={() => selectAndShowJob(id)}
              data-test-subj={`mlDiscoverADManagementCurrentJobRadio-${id}`}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
    </div>
  );
};
