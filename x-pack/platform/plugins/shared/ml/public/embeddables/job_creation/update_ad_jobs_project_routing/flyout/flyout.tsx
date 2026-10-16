/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import type { ICPSManager } from '@kbn/cps-utils';
import { extractErrorMessage, type ErrorType } from '@kbn/ml-error-utils';
import { MlProjectPickerPanel } from '@kbn/ml-cps';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { showProjectRoutingChangeConfirmModal } from '../../../../application/jobs/components/project_routing_change_confirm';
import { DEFAULT_ML_PROJECT_ROUTING } from '../../../../../common/constants/cps';
import { useMlKibana, useNotifications } from '../../../../application/contexts/kibana';
import { useJobsApiService } from '../../../../application/services/ml_api_service/jobs';
import { getIsMlCpsEnabled } from '../../../../application/services/ml_server_info';
import { loadMlServerInfo } from '../../../../application/services/ml_server_info';

interface Props {
  onClose: () => void;
  initialJobIds?: string[];
  allowScopeSelection?: boolean;
}

function getSelectedProjectRoutingFromJobs(
  jobs: Array<{ datafeed_config: { project_routing?: string } }>,
  manager: ICPSManager
): string {
  const defaultProjectRouting = manager.getDefaultProjectRouting();
  if (jobs.length === 0) {
    return defaultProjectRouting ?? DEFAULT_ML_PROJECT_ROUTING;
  }

  const projectRoutings = jobs.map((job) => job.datafeed_config.project_routing);
  const allUndefined = projectRoutings.every((routing) => routing == null);
  if (allUndefined) {
    // if the jobs haven't been migrated to CPS yet, use ML's default project routing _origin
    return DEFAULT_ML_PROJECT_ROUTING;
  }

  const [firstRouting] = projectRoutings;
  const allSame = projectRoutings.every((routing) => routing === firstRouting);
  if (allSame && firstRouting != null) {
    return firstRouting;
  }

  // if the jobs have a mix of project routings, use the space default
  return defaultProjectRouting ?? DEFAULT_ML_PROJECT_ROUTING;
}

export const UpdateADJobsProjectRoutingFlyout: FC<Props> = ({
  onClose,
  initialJobIds,
  allowScopeSelection,
}) => {
  const { services } = useMlKibana();
  const { cps, overlays, rendering } = services;
  const { toasts } = useNotifications();
  const jobsApi = useJobsApiService();
  const cpsManager = cps?.cpsManager;
  const totalProjectCount = cpsManager?.getTotalProjectCount() ?? 0;
  const isMlCpsEnabled = getIsMlCpsEnabled();

  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [updateResults, setUpdateResults] = useState<Record<string, { success: boolean }> | null>(
    null
  );
  const [selectedProjectRouting, setSelectedProjectRouting] = useState<string>(
    DEFAULT_ML_PROJECT_ROUTING
  );
  const [hasInitializedProjectRouting, setHasInitializedProjectRouting] = useState(false);

  const fetchProjectsByRouting = useCallback(
    (routing?: ProjectRouting) =>
      isMlCpsEnabled && cpsManager
        ? cpsManager?.fetchProjects(routing) ?? Promise.resolve(null)
        : Promise.resolve(null),
    [cpsManager, isMlCpsEnabled]
  );

  const defaultProjectRoutingGetter = useCallback(() => {
    return cpsManager?.getDefaultProjectRouting();
  }, [cpsManager]);

  const onProjectRoutingChange = useCallback((projectRouting: ProjectRouting) => {
    setSelectedProjectRouting(projectRouting as string);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadError(null);
      setLoading(true);
      try {
        const manager = cps?.cpsManager;
        if (manager) {
          await Promise.all([manager.whenReady(), loadMlServerInfo(services.mlServices.mlApi)]);
        }
        if (cancelled) {
          return;
        }

        let nextJobIds: string[];
        if (initialJobIds) {
          nextJobIds = initialJobIds;
        } else {
          const response = await jobsApi.bulkUpdateProjectRouting({
            projectRouting: selectedProjectRouting,
            simulate: true,
            auto: true,
          });
          if (cancelled) {
            return;
          }
          nextJobIds = Object.keys(response.results).sort();
        }

        setJobIds(nextJobIds);

        if (!hasInitializedProjectRouting && nextJobIds.length > 0 && manager) {
          const jobs = await jobsApi.jobs(nextJobIds);
          if (cancelled) {
            return;
          }
          setSelectedProjectRouting(getSelectedProjectRoutingFromJobs(jobs, manager));
          setHasInitializedProjectRouting(true);
        }
      } catch (e) {
        if (cancelled) {
          return;
        }
        setLoadError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    cps,
    jobsApi,
    initialJobIds,
    selectedProjectRouting,
    hasInitializedProjectRouting,
    services.mlServices.mlApi,
  ]);

  const onUpdateProjectRouting = useCallback(async () => {
    if (jobIds.length === 0 || !cpsManager) {
      return;
    }
    try {
      await showProjectRoutingChangeConfirmModal({
        overlays,
        rendering,
        countsDependencies: {
          jobIds,
          selectedProjectRouting,
          getJobs: jobsApi.jobs,
          cpsManager,
        },
      });
    } catch {
      return;
    }
    setUpdating(true);
    try {
      const response = await jobsApi.bulkUpdateProjectRouting({
        projectRouting: selectedProjectRouting,
        jobIds,
      });
      const next: Record<string, { success: boolean }> = {};
      for (const id of jobIds) {
        const r = response.results[id];
        next[id] = { success: r?.success === true };
      }
      setUpdateResults(next);
      const successCount = jobIds.filter((id) => next[id]?.success).length;
      const failCount = jobIds.length - successCount;

      for (const id of jobIds) {
        const restartError = response.results[id]?.restartError;
        if (restartError != null) {
          const error =
            restartError instanceof Error
              ? restartError
              : new Error(extractErrorMessage(restartError as ErrorType));
          toasts.addError(error, {
            title: i18n.translate(
              'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.restartErrorTitle',
              {
                defaultMessage: 'Failed to restart datafeed for job {jobId}',
                values: { jobId: id },
              }
            ),
          });
        }
      }

      if (failCount === 0) {
        toasts.addSuccess(
          i18n.translate('xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.updateSuccess', {
            defaultMessage:
              'Successfully updated project routing for {count, plural, one {# job} other {# jobs}}.',
            values: { count: successCount },
          })
        );
        if (onClose) {
          onClose();
        }
      } else if (successCount === 0) {
        toasts.addDanger(
          i18n.translate('xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.updateAllFailed', {
            defaultMessage: 'Project routing was not updated for any job.',
          })
        );
      } else {
        toasts.addWarning(
          i18n.translate('xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.updatePartial', {
            defaultMessage:
              'Project routing was updated for {success} of {total} jobs. Any jobs that were previously running will need to be restarted if their update failed.',
            values: { success: successCount, total: jobIds.length },
          })
        );
      }
    } catch (e) {
      toasts.addError(e instanceof Error ? e : new Error(String(e)), {
        title: i18n.translate(
          'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.updateErrorTitle',
          {
            defaultMessage: 'Project routing update failed',
          }
        ),
      });
    } finally {
      setUpdating(false);
    }
  }, [jobIds, jobsApi, selectedProjectRouting, toasts, onClose, overlays, rendering, cpsManager]);

  const allUpdatesSucceeded = useMemo(
    () =>
      updateResults !== null &&
      jobIds.length > 0 &&
      jobIds.every((id) => updateResults[id]?.success === true),
    [updateResults, jobIds]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="ml-flyout-layer-title">
            <FormattedMessage
              id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.title"
              defaultMessage="Update project routing for {count, plural, one {# anomaly detection job} other {# anomaly detection jobs}}"
              values={{ count: jobIds.length }}
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {allowScopeSelection && totalProjectCount > 1 ? (
          <>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.projectRoutingLabel"
                  defaultMessage="Project scope"
                />
              }
            >
              <MlProjectPickerPanel
                projectRouting={selectedProjectRouting}
                onProjectRoutingChange={onProjectRoutingChange}
                fetchProjectsByRouting={fetchProjectsByRouting}
                defaultProjectRoutingGetter={defaultProjectRoutingGetter}
                totalProjectCount={totalProjectCount}
                projectRoutingValueTestSubj="mlUpdateAdJobsProjectRoutingValue"
                disabled={hasInitializedProjectRouting === false}
              />
            </EuiFormRow>
            {selectedProjectRouting !== DEFAULT_ML_PROJECT_ROUTING ? (
              <>
                <EuiSpacer size="s" />
                <KbnWarningCallout
                  announceOnMount
                  title={i18n.translate(
                    'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.nonDefaultScopeWarningTitle',
                    {
                      defaultMessage: 'Non-default project scope selected',
                    }
                  )}
                  text={
                    <FormattedMessage
                      id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.nonDefaultScopeWarning"
                      defaultMessage="Using a project routing scope other than {defaultScope} may negatively affect the job's anomaly detection results."
                      values={{ defaultScope: DEFAULT_ML_PROJECT_ROUTING }}
                    />
                  }
                  data-test-subj="mlUpdateAdJobsProjectRoutingScopeWarning"
                />
              </>
            ) : null}
            <EuiSpacer size="m" />
          </>
        ) : null}
        {loading ? (
          <EuiFlexGroup alignItems="center" justifyContent="spaceAround" style={{ minHeight: 120 }}>
            <EuiLoadingSpinner size="l" data-test-subj="mlUpdateAdJobsProjectRoutingLoading" />
          </EuiFlexGroup>
        ) : loadError ? (
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate(
              'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.loadErrorTitle',
              {
                defaultMessage: 'Could not load jobs for project routing update',
              }
            )}
          >
            {loadError.message}
          </KbnDangerCallout>
        ) : jobIds.length === 0 ? (
          <EuiEmptyPrompt
            data-test-subj="mlUpdateAdJobsProjectRoutingNoJobs"
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.noJobs"
                  defaultMessage="No anomaly detection jobs are available to update right now."
                />
              </p>
            }
          />
        ) : (
          <>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.jobListIntro"
                  defaultMessage="The following jobs can have their project routing updated."
                />
              </p>
            </EuiText>

            <EuiListGroup maxWidth={true} data-test-subj="mlUpdateAdJobsProjectRoutingJobList">
              {jobIds.map((id) => {
                const result = updateResults?.[id];
                const label = (
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    data-test-subj={`mlUpdateAdJobsProjectRoutingJob-${id}`}
                  >
                    {result !== undefined ? (
                      <EuiIcon
                        type={result.success ? 'check' : 'cross'}
                        color={result.success ? 'success' : 'danger'}
                        data-test-subj={
                          result.success
                            ? 'mlUpdateAdJobsProjectRoutingJobSuccess'
                            : 'mlUpdateAdJobsProjectRoutingJobFailed'
                        }
                        aria-hidden
                      />
                    ) : null}
                    <EuiText size="s">{id}</EuiText>
                  </EuiFlexGroup>
                );
                return <EuiListGroupItem key={id} label={label} wrapText />;
              })}
            </EuiListGroup>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              isDisabled={updating}
              data-test-subj="mlUpdateAdJobsProjectRoutingClose"
            >
              <FormattedMessage
                id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onUpdateProjectRouting}
              isLoading={updating}
              isDisabled={
                hasInitializedProjectRouting === false ||
                loading ||
                loadError !== null ||
                jobIds.length === 0 ||
                allUpdatesSucceeded
              }
              data-test-subj="mlUpdateAdJobsProjectRoutingSubmit"
            >
              <FormattedMessage
                id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.updateButton"
                defaultMessage="Update {count, plural, one {# job} other {# jobs}}"
                values={{ count: jobIds.length }}
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
