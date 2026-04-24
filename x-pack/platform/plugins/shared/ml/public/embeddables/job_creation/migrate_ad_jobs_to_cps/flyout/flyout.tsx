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
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { useMlKibana, useNotifications } from '../../../../application/contexts/kibana';
import { useJobsApiService } from '../../../../application/services/ml_api_service/jobs';

interface Props {
  onClose: () => void;
}

const DEFAULT_PROJECT_ROUTING = '_alias:_origin';

export const MigrateADJobsToCpsFlyout: FC<Props> = ({ onClose }) => {
  const { services } = useMlKibana();
  const { cps } = services;
  const { toasts } = useNotifications();
  const jobsApi = useJobsApiService();

  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [migrationResults, setMigrationResults] = useState<Record<
    string,
    { success: boolean }
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadError(null);
      setLoading(true);
      try {
        const manager = cps?.cpsManager;
        if (manager) {
          await manager.whenReady();
        }
        if (cancelled) {
          return;
        }
        const response = await jobsApi.bulkUpdateProjectRouting({
          projectRouting: DEFAULT_PROJECT_ROUTING,
          simulate: true,
          auto: true,
        });
        if (cancelled) {
          return;
        }
        setJobIds(Object.keys(response.results).sort());
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
  }, [cps, jobsApi]);

  const onMigrate = useCallback(async () => {
    if (jobIds.length === 0) {
      return;
    }
    setMigrating(true);
    try {
      const response = await jobsApi.bulkUpdateProjectRouting({
        projectRouting: DEFAULT_PROJECT_ROUTING,
        jobIds,
      });
      const next: Record<string, { success: boolean }> = {};
      for (const id of jobIds) {
        const r = response.results[id];
        next[id] = { success: r?.success === true };
      }
      setMigrationResults(next);
      const successCount = jobIds.filter((id) => next[id]?.success).length;
      const failCount = jobIds.length - successCount;
      if (failCount === 0) {
        toasts.addSuccess(
          i18n.translate('xpack.ml.embeddables.migrateADJobsToCpsFlyout.migrateSuccess', {
            defaultMessage:
              'Successfully migrated {count, plural, one {# job} other {# jobs}} to cross-project search.',
            values: { count: successCount },
          })
        );
      } else if (successCount === 0) {
        toasts.addDanger(
          i18n.translate('xpack.ml.embeddables.migrateADJobsToCpsFlyout.migrateAllFailed', {
            defaultMessage: 'The migration did not complete for any job.',
          })
        );
      } else {
        toasts.addWarning(
          i18n.translate('xpack.ml.embeddables.migrateADJobsToCpsFlyout.migratePartial', {
            defaultMessage: '{success} of {total} jobs were migrated. See the list for details.',
            values: { success: successCount, total: jobIds.length },
          })
        );
      }
    } catch (e) {
      toasts.addError(e instanceof Error ? e : new Error(String(e)), {
        title: i18n.translate('xpack.ml.embeddables.migrateADJobsToCpsFlyout.migrateErrorTitle', {
          defaultMessage: 'Job migration failed',
        }),
      });
    } finally {
      setMigrating(false);
    }
  }, [jobIds, jobsApi, toasts]);

  const allMigrationsSucceeded = useMemo(
    () =>
      migrationResults !== null &&
      jobIds.length > 0 &&
      jobIds.every((id) => migrationResults[id]?.success === true),
    [migrationResults, jobIds]
  );

  const renderBody = () => {
    if (loading) {
      return (
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" style={{ minHeight: 120 }}>
          <EuiLoadingSpinner size="l" data-test-subj="mlMigrateAdJobsToCpsLoading" />
        </EuiFlexGroup>
      );
    }
    if (loadError) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          title={i18n.translate('xpack.ml.embeddables.migrateADJobsToCpsFlyout.loadErrorTitle', {
            defaultMessage: 'Could not load jobs for migration',
          })}
        >
          {loadError.message}
        </EuiCallOut>
      );
    }
    if (jobIds.length === 0) {
      return (
        <EuiEmptyPrompt
          data-test-subj="mlMigrateAdJobsToCpsNoJobs"
          body={
            <p>
              <FormattedMessage
                id="xpack.ml.embeddables.migrateADJobsToCpsFlyout.noJobs"
                defaultMessage="No anomaly detection jobs are available to migrate right now."
              />
            </p>
          }
        />
      );
    }
    return (
      <>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ml.embeddables.migrateADJobsToCpsFlyout.jobListIntro"
              defaultMessage="The following jobs can be migrated to cross-project search."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiListGroup maxWidth={true} data-test-subj="mlMigrateAdJobsToCpsJobList" gutterSize="s">
          {jobIds.map((id) => {
            const result = migrationResults?.[id];
            const label = (
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                data-test-subj={`mlMigrateAdJobsToCpsJob-${id}`}
              >
                {result !== undefined ? (
                  <EuiIcon
                    type={result.success ? 'check' : 'cross'}
                    color={result.success ? 'success' : 'danger'}
                    data-test-subj={
                      result.success
                        ? 'mlMigrateAdJobsToCpsJobSuccess'
                        : 'mlMigrateAdJobsToCpsJobFailed'
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
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="ml-flyout-layer-title">
            <FormattedMessage
              id="xpack.ml.embeddables.migrateADJobsToCpsFlyout.title"
              defaultMessage="Migrate {count, plural, one {# legacy anomaly detection job} other {# legacy anomaly detection jobs}}"
              values={{ count: jobIds.length }}
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              isDisabled={migrating}
              data-test-subj="mlMigrateAdJobsToCpsClose"
            >
              <FormattedMessage
                id="xpack.ml.embeddables.migrateADJobsToCpsFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onMigrate}
              isLoading={migrating}
              isDisabled={
                loading || loadError !== null || jobIds.length === 0 || allMigrationsSucceeded
              }
              data-test-subj="mlMigrateAdJobsToCpsSubmit"
            >
              <FormattedMessage
                id="xpack.ml.embeddables.migrateADJobsToCpsFlyout.migrateButton"
                defaultMessage="Migrate {count, plural, one {# job} other {# jobs}}"
                values={{ count: jobIds.length }}
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
