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
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { useMlApi, useMlKibana } from '../../../../application/contexts/kibana';
import { MlManagementLocatorInternal } from '../../../../locator/ml_management_locator';
import {
  useSelectedJobId,
  useShowAnomalies,
} from '../../../../application/components/job_suggestion/use_selected_job_id';

const deselectLabel = i18n.translate('xpack.ml.discoverADManagementFlyout.deselectJobAriaLabel', {
  defaultMessage: 'Deselect job',
});

const showAnomaliesLabel = i18n.translate(
  'xpack.ml.discoverADManagementFlyout.showAnomaliesLabel',
  {
    defaultMessage: 'Show anomalies',
  }
);

interface Props {
  indexPattern: string;
}

/** The job whose results are shown on the chart, which is nothing when there is no job selected. */
export const SelectedJob: FC<Props> = ({ indexPattern }) => {
  const mlApi = useMlApi();
  const {
    services: {
      share,
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  const [selectedJobId, selectJob] = useSelectedJobId(indexPattern);
  const [showAnomalies, setShowAnomalies] = useShowAnomalies(indexPattern);
  const [description, setDescription] = useState<{ jobId: string; text: string }>();
  const [explorerUrl, setExplorerUrl] = useState<{ jobId: string; url: string }>();
  const [manageUrl, setManageUrl] = useState<{ jobId: string; url: string }>();

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }
    let isCurrent = true;
    mlApi.jobs
      .jobsSummary([selectedJobId])
      .then((jobs) => {
        if (!isCurrent) return;
        const job = jobs.find(({ id }) => id === selectedJobId);
        if (job) {
          setDescription({ jobId: job.id, text: job.description });
          return;
        }
        // The job has been deleted since it was selected
        selectJob(undefined);
      })
      // The id is shown without a description, and stays selected
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [mlApi, selectedJobId, selectJob]);

  // The page is for the time range of the chart, which is not known to the page which is opened in another tab
  useEffect(() => {
    if (!selectedJobId) {
      return;
    }
    let isCurrent = true;
    share.url.locators
      .get(ML_APP_LOCATOR)
      ?.getUrl({
        page: ML_PAGES.ANOMALY_EXPLORER,
        pageState: { jobIds: [selectedJobId], timeRange: timefilter.getTime() },
      })
      .then((url) => {
        if (isCurrent) setExplorerUrl({ jobId: selectedJobId, url });
      })
      // The button is not shown without the url
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [share, timefilter, selectedJobId]);

  // The jobs list, filtered to the selected job
  useEffect(() => {
    if (!selectedJobId) {
      return;
    }
    let isCurrent = true;
    new MlManagementLocatorInternal(share)
      .getUrl(
        { page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE, pageState: { jobId: selectedJobId } },
        'anomaly_detection'
      )
      .then(({ url }) => {
        if (isCurrent && url) setManageUrl({ jobId: selectedJobId, url });
      })
      // The button is not shown without the url
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [share, selectedJobId]);

  if (!selectedJobId) {
    return null;
  }

  const text = description?.jobId === selectedJobId ? description.text : undefined;
  const url = explorerUrl?.jobId === selectedJobId ? explorerUrl.url : undefined;
  const jobsListUrl = manageUrl?.jobId === selectedJobId ? manageUrl.url : undefined;

  return (
    <>
      <EuiSwitch
        label={showAnomaliesLabel}
        checked={showAnomalies}
        onChange={(e) => setShowAnomalies(e.target.checked)}
        data-test-subj="mlDiscoverADManagementShowAnomalies"
      />
      <EuiSpacer size="m" />
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        color="primary"
        data-test-subj="mlDiscoverADManagementSelectedJob"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.discoverADManagementFlyout.selectedJobTitle"
                defaultMessage="Job shown on the chart"
              />
            </EuiText>
            <EuiText size="s">
              <strong>{selectedJobId}</strong>
            </EuiText>
            {text ? (
              <EuiText size="s" color="subdued">
                {text}
              </EuiText>
            ) : null}
            {url || jobsListUrl ? (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" wrap responsive={false}>
                  {jobsListUrl ? (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        iconType="external"
                        iconSide="right"
                        href={jobsListUrl}
                        target="_blank"
                        data-test-subj="mlDiscoverADManagementSelectedJobManage"
                      >
                        <FormattedMessage
                          id="xpack.ml.discoverADManagementFlyout.manageJobButton"
                          defaultMessage="Manage job"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  ) : null}
                  {url ? (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        iconType="external"
                        iconSide="right"
                        href={url}
                        target="_blank"
                        data-test-subj="mlDiscoverADManagementSelectedJobExplorer"
                      >
                        <FormattedMessage
                          id="xpack.ml.discoverADManagementFlyout.viewInAnomalyExplorerButton"
                          defaultMessage="View in Anomaly Explorer"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={deselectLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                aria-label={deselectLabel}
                onClick={() => selectJob(undefined)}
                data-test-subj="mlDiscoverADManagementSelectedJobDeselect"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
