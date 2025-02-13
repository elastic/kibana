/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import type { FC } from 'react';
import { useEffect, useMemo, useCallback } from 'react';
import React, { useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { ExportJobDependenciesWarningCallout } from './export_job_warning_callout';
import type { JobType } from '../../../../../common/types/saved_objects';
import { useMlKibana } from '../../../contexts/kibana';
import { JobsExportService } from './jobs_export_service';
import type { JobDependencies } from './jobs_export_service';
import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';

const LoadingSpinner: FC = () => (
  <>
    <EuiSpacer size="l" />
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

const SwitchTabsConfirm: FC<{ onCancel: () => void; onConfirm: () => void }> = ({
  onCancel,
  onConfirm,
}) => (
  <EuiConfirmModal
    title={i18n.translate('xpack.ml.importExport.exportFlyout.switchTabsConfirm.title', {
      defaultMessage: 'Change tabs?',
    })}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={i18n.translate(
      'xpack.ml.importExport.exportFlyout.switchTabsConfirm.cancelButton',
      {
        defaultMessage: 'Cancel',
      }
    )}
    confirmButtonText={i18n.translate(
      'xpack.ml.importExport.exportFlyout.switchTabsConfirm.confirmButton',
      {
        defaultMessage: 'Confirm',
      }
    )}
    defaultFocusedButton="confirm"
  >
    <p>
      <FormattedMessage
        id="xpack.ml.importExport.exportFlyout.switchTabsConfirm.text"
        defaultMessage="Changing tabs will clear currently selected jobs"
      />
    </p>
  </EuiConfirmModal>
);

export interface ExportJobsFlyoutContentProps {
  currentTab: JobType;
  isADEnabled: boolean;
  isDFAEnabled: boolean;
  onClose: () => void;
}

export const ExportJobsFlyoutContent = ({
  currentTab,
  isADEnabled,
  isDFAEnabled,
  onClose,
}: ExportJobsFlyoutContentProps) => {
  const {
    services: {
      notifications: { toasts },
      mlServices: { mlUsageCollection, mlApi },
    },
  } = useMlKibana();

  const {
    getJobs,
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = mlApi;

  const jobsExportService = useMemo(() => new JobsExportService(mlApi), [mlApi]);
  const [adJobIds, setAdJobIds] = useState<string[]>([]);
  const [dfaJobIds, setDfaJobIds] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<JobType>(currentTab);
  const { displayErrorToast, displaySuccessToast } = useMemo(
    () => toastNotificationServiceProvider(toasts),
    [toasts]
  );
  const [jobDependencies, setJobDependencies] = useState<JobDependencies>([]);
  const [loadingADJobs, setLoadingADJobs] = useState(true);
  const [loadingDFAJobs, setLoadingDFAJobs] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [switchTabConfirmVisible, setSwitchTabConfirmVisible] = useState(false);
  const [switchTabNextTab, setSwitchTabNextTab] = useState<JobType>(currentTab);
  const [selectedJobDependencies, setSelectedJobDependencies] = useState<JobDependencies>([]);

  async function onExport() {
    setExporting(true);
    const title = i18n.translate('xpack.ml.importExport.exportFlyout.exportDownloading', {
      defaultMessage: 'Your file is downloading in the background',
    });

    displaySuccessToast(title);

    try {
      if (selectedJobType === 'anomaly-detector') {
        await jobsExportService.exportAnomalyDetectionJobs(selectedJobIds);
      } else {
        await jobsExportService.exportDataframeAnalyticsJobs(selectedJobIds);
      }

      mlUsageCollection.count(
        selectedJobType === 'anomaly-detector'
          ? 'exported_anomaly_detector_jobs'
          : 'exported_data_frame_analytics_jobs',
        selectedJobIds.length
      );

      setExporting(false);
      onClose();
    } catch (error) {
      const errorTitle = i18n.translate('xpack.ml.importExport.exportFlyout.exportError', {
        defaultMessage: 'Could not export selected jobs',
      });
      displayErrorToast(error, errorTitle);
      setExporting(false);
    }
  }

  function toggleSelectedJob(checked: boolean, id: string) {
    if (checked) {
      setSelectedJobIds([...selectedJobIds, id]);
    } else {
      setSelectedJobIds(selectedJobIds.filter((id2) => id2 !== id));
    }
  }

  function switchTab(jobType: JobType) {
    setSwitchTabConfirmVisible(false);
    setSelectedJobIds([]);
    setSelectedJobType(jobType);
  }

  function onSelectAll() {
    const ids = selectedJobType === 'anomaly-detector' ? adJobIds : dfaJobIds;
    if (selectedJobIds.length === ids.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds([...ids]);
    }
  }

  const attemptTabSwitch = useCallback(
    (jobType: JobType) => {
      if (jobType === selectedJobType) {
        return;
      }
      // if the user has already selected some jobs, open a confirm modal
      // rather than changing tabs
      if (selectedJobIds.length > 0) {
        setSwitchTabNextTab(jobType);
        setSwitchTabConfirmVisible(true);
        return;
      }

      switchTab(jobType);
    },

    [selectedJobIds, selectedJobType]
  );

  useEffect(() => {
    setSelectedJobDependencies(
      jobDependencies.filter(({ jobId }) => selectedJobIds.includes(jobId))
    );
  }, [jobDependencies, selectedJobIds]);

  useEffect(
    function onFlyoutChange() {
      setLoadingADJobs(true);
      setLoadingDFAJobs(true);
      setExporting(false);
      setSwitchTabConfirmVisible(false);
      setAdJobIds([]);
      setSelectedJobIds([]);
      setSelectedJobType(currentTab);

      if (isADEnabled) {
        getJobs()
          .then(({ jobs }) => {
            setLoadingADJobs(false);
            setAdJobIds(jobs.map((j) => j.job_id));

            jobsExportService
              .getJobDependencies(jobs)
              .then((jobDeps) => {
                setJobDependencies(jobDeps);
                setLoadingADJobs(false);
              })
              .catch((error) => {
                const errorTitle = i18n.translate(
                  'xpack.ml.importExport.exportFlyout.calendarsError',
                  {
                    defaultMessage: 'Could not load calendars',
                  }
                );
                displayErrorToast(error, errorTitle);
              });
          })
          .catch((error) => {
            const errorTitle = i18n.translate('xpack.ml.importExport.exportFlyout.adJobsError', {
              defaultMessage: 'Could not load anomaly detection jobs',
            });
            displayErrorToast(error, errorTitle);
          });
      }

      if (isDFAEnabled) {
        getDataFrameAnalytics()
          .then(({ data_frame_analytics: dataFrameAnalytics }) => {
            setLoadingDFAJobs(false);
            setDfaJobIds(dataFrameAnalytics.map((j) => j.id));
          })
          .catch((error) => {
            const errorTitle = i18n.translate('xpack.ml.importExport.exportFlyout.dfaJobsError', {
              defaultMessage: 'Could not load data frame analytics jobs',
            });
            displayErrorToast(error, errorTitle);
          });
      }
    },
    [
      currentTab,
      displayErrorToast,
      getDataFrameAnalytics,
      getJobs,
      isADEnabled,
      isDFAEnabled,
      jobsExportService,
    ]
  );

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        hideCloseButton
        size="s"
        data-test-subj="mlJobMgmtExportJobsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.importExport.exportFlyout.flyoutHeader"
                defaultMessage="Export jobs"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ExportJobDependenciesWarningCallout jobs={selectedJobDependencies} />
          <EuiTabs size="s">
            {isADEnabled === true ? (
              <EuiTab
                isSelected={selectedJobType === 'anomaly-detector'}
                onClick={() => attemptTabSwitch('anomaly-detector')}
                disabled={exporting}
                data-test-subj="mlJobMgmtExportJobsADTab"
              >
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.adTab"
                  defaultMessage="Anomaly detection"
                />
              </EuiTab>
            ) : null}
            {isDFAEnabled === true ? (
              <EuiTab
                isSelected={selectedJobType === 'data-frame-analytics'}
                onClick={() => attemptTabSwitch('data-frame-analytics')}
                disabled={exporting}
                data-test-subj="mlJobMgmtExportJobsDFATab"
              >
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.dfaTab"
                  defaultMessage="Analytics"
                />
              </EuiTab>
            ) : null}
          </EuiTabs>
          <EuiSpacer size="s" />
          <>
            {isADEnabled === true && selectedJobType === 'anomaly-detector' && (
              <>
                {loadingADJobs === true ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <EuiButtonEmpty
                      size="xs"
                      onClick={onSelectAll}
                      data-test-subj="mlJobMgmtExportJobsSelectAllButton"
                    >
                      {selectedJobIds.length === adJobIds.length ? (
                        <FormattedMessage
                          id="xpack.ml.importExport.exportFlyout.adDeselectAllButton"
                          defaultMessage="Deselect all"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.ml.importExport.exportFlyout.adSelectAllButton"
                          defaultMessage="Select all"
                        />
                      )}
                    </EuiButtonEmpty>

                    <EuiSpacer size="xs" />

                    <div data-test-subj="mlJobMgmtExportJobsADJobList">
                      {adJobIds.map((id) => (
                        <div key={id}>
                          <EuiCheckbox
                            id={id}
                            label={id}
                            checked={selectedJobIds.includes(id)}
                            onChange={(e) => toggleSelectedJob(e.target.checked, id)}
                          />
                          <EuiSpacer size="s" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {isDFAEnabled === true && selectedJobType === 'data-frame-analytics' && (
              <>
                {loadingDFAJobs === true ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <EuiButtonEmpty
                      size="xs"
                      onClick={onSelectAll}
                      data-test-subj="mlJobMgmtExportJobsSelectAllButton"
                    >
                      {selectedJobIds.length === dfaJobIds.length ? (
                        <FormattedMessage
                          id="xpack.ml.importExport.exportFlyout.dfaDeselectAllButton"
                          defaultMessage="Deselect all"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.ml.importExport.exportFlyout.dfaSelectAllButton"
                          defaultMessage="Select all"
                        />
                      )}
                    </EuiButtonEmpty>

                    <EuiSpacer size="xs" />
                    <div data-test-subj="mlJobMgmtExportJobsDFAJobList">
                      {dfaJobIds.map((id) => (
                        <div key={id}>
                          <EuiCheckbox
                            id={id}
                            label={id}
                            checked={selectedJobIds.includes(id)}
                            onChange={(e) => toggleSelectedJob(e.target.checked, id)}
                          />
                          <EuiSpacer size="s" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose.bind(null)} flush="left">
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={selectedJobIds.length === 0 || exporting === true}
                onClick={onExport}
                fill
                data-test-subj="mlJobMgmtExportExportButton"
              >
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.exportButton"
                  defaultMessage="Export"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {switchTabConfirmVisible === true ? (
        <SwitchTabsConfirm
          onCancel={setSwitchTabConfirmVisible.bind(null, false)}
          onConfirm={() => switchTab(switchTabNextTab)}
        />
      ) : null}
    </>
  );
};
