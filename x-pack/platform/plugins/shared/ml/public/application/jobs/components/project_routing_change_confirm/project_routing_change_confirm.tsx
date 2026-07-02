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
  EUI_MODAL_CONFIRM_BUTTON,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { ICPSManager } from '@kbn/cps-utils/types';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  countsDependencies?: {
    jobIds: string[];
    selectedProjectRouting: string;
    getJobs: (jobIds: string[]) => Promise<CombinedJobWithStats[]>;
    cpsManager: ICPSManager;
  };
}

function getProjectsFromRouting(
  projectRouting: string | undefined,
  allProjects: string[]
): string[] {
  if (!projectRouting) {
    return [];
  }
  const scope = projectRouting.split(':')[1];
  if (scope === undefined) {
    return [];
  }
  if (scope === '*') {
    return allProjects;
  }
  return scope.split(',').filter((project) => project.length > 0);
}

function getScopeChangeCounts(
  currentScope: string[],
  selectedProjects: string[]
): { added: number; removed: number } {
  const currentSet = new Set(currentScope);
  const selectedSet = new Set(selectedProjects);

  const added = selectedProjects.filter((project) => !currentSet.has(project)).length;
  const removed = currentScope.filter((project) => !selectedSet.has(project)).length;

  return { added, removed };
}

function ScopeChangeCount({ count, type }: { count: number; type: 'added' | 'removed' }) {
  const prefix = type === 'added' ? '+' : '-';
  const color = count === 0 ? 'subdued' : type === 'added' ? 'success' : 'danger';

  return (
    <EuiText size="s" color={color} textAlign="right">
      {`${prefix}${count}`}
    </EuiText>
  );
}

export const ProjectRoutingChangeConfirmModal: FC<Props> = ({
  onCancel,
  onConfirm,
  countsDependencies,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'confirmModalTitle' });
  const [jobScopeChangeCounts, setJobScopeChangeCounts] = useState<
    Map<string, { added: number; removed: number }>
  >(new Map());

  useEffect(() => {
    async function fetchData() {
      if (!countsDependencies) {
        return;
      }
      const { jobIds, selectedProjectRouting, getJobs, cpsManager } = countsDependencies;
      const [projects, jobs] = await Promise.all([cpsManager.fetchProjects(), getJobs(jobIds)]);
      const allProjects = projects?.linkedProjects.map((project) => project._alias) ?? [];
      allProjects.push('_origin');
      const selectedProjects = getProjectsFromRouting(selectedProjectRouting, allProjects);

      const jobScopes = jobs.reduce((acc, job) => {
        acc[job.job_id] = getProjectsFromRouting(job.datafeed_config.project_routing, allProjects);
        return acc;
      }, {} as Record<string, string[]>);

      const changeCounts = new Map<string, { added: number; removed: number }>();
      for (const [jobId, currentScope] of Object.entries(jobScopes)) {
        changeCounts.set(jobId, getScopeChangeCounts(currentScope, selectedProjects));
      }
      setJobScopeChangeCounts(changeCounts);
    }

    fetchData();
  }, [countsDependencies]);

  return (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      title={i18n.translate(
        'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalTitle',
        {
          defaultMessage: 'Update project routing?',
        }
      )}
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalCancel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalConfirm',
        {
          defaultMessage: 'Update',
        }
      )}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      data-test-subj="mlUpdateAdJobsProjectRoutingConfirmModal"
    >
      <EuiText>
        <FormattedMessage
          id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalBody"
          defaultMessage="The model for this job was trained on a specific set of data. Changing this data set may cause temporary model instability and an increase in false-positives. Are you sure you want to apply these changes?"
        />

        {countsDependencies ? (
          <>
            <EuiSpacer size="s" />

            <h6>
              <FormattedMessage
                id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.affectedJobsTitle"
                defaultMessage="Affected jobs"
              />
            </h6>

            <EuiPanel
              paddingSize="s"
              hasBorder={false}
              hasShadow={false}
              color="subdued"
              css={{ maxHeight: '250px', overflowY: 'auto' }}
            >
              {countsDependencies.jobIds.map((jobId) => {
                const counts = jobScopeChangeCounts.get(jobId) ?? { added: 0, removed: 0 };

                return (
                  <EuiFlexGroup
                    key={jobId}
                    responsive={false}
                    gutterSize="s"
                    alignItems="center"
                    data-test-subj={`mlUpdateAdJobsProjectRoutingConfirmModalJob-${jobId}`}
                  >
                    <EuiFlexItem>
                      <EuiText size="s">{jobId}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <ScopeChangeCount count={counts.added} type="added" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <ScopeChangeCount count={counts.removed} type="removed" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              })}
            </EuiPanel>
          </>
        ) : null}
      </EuiText>
    </EuiConfirmModal>
  );
};

export function showProjectRoutingChangeConfirmModal({
  overlays,
  rendering,
  countsDependencies,
}: {
  overlays: OverlayStart;
  rendering: RenderingService;
  countsDependencies?: {
    jobIds: string[];
    selectedProjectRouting: string;
    getJobs: (jobIds: string[]) => Promise<CombinedJobWithStats[]>;
    cpsManager: ICPSManager;
  };
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const modalSession = overlays.openModal(
        toMountPoint(
          <ProjectRoutingChangeConfirmModal
            countsDependencies={countsDependencies}
            onCancel={() => {
              modalSession.close();
              reject();
            }}
            onConfirm={() => {
              modalSession.close();
              resolve();
            }}
          />,
          rendering
        )
      );
    } catch (e) {
      reject(e);
    }
  });
}
