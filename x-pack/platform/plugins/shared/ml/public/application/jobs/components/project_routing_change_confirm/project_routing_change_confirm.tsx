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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { ProjectRouting } from '@kbn/es-query';
import { useFetchProjects } from '@kbn/cps-utils';
import type { CPSProject, ICPSManager, ProjectsData } from '@kbn/cps-utils';

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

function getProjectAliasesFromProjects(
  originProject: CPSProject | null,
  linkedProjects: CPSProject[]
): string[] {
  const aliases = linkedProjects.map((project) => project._alias);
  if (originProject) {
    aliases.push('_origin');
  }
  return aliases;
}

function getProjectAliasesFromProjectsData(projectsData: ProjectsData | null): string[] {
  if (!projectsData) {
    return [];
  }
  return getProjectAliasesFromProjects(projectsData.origin, projectsData.linkedProjects);
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

const ScopeChangeCount: FC<{ count: number; type: 'added' | 'removed' }> = ({ count, type }) => {
  const { euiTheme } = useEuiTheme();
  const prefix = type === 'added' ? '+' : '-';
  const color =
    count === 0 ? euiTheme.colors.textDisabled : type === 'added' ? 'success' : 'danger';

  return (
    <EuiText size="s" color={color} textAlign="right">
      {`${prefix}${count}`}
    </EuiText>
  );
};

export const ProjectRoutingChangeConfirmModal: FC<Props> = ({
  onCancel,
  onConfirm,
  countsDependencies,
}) => {
  const { euiTheme } = useEuiTheme();
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'confirmModalTitle' });
  const [jobScopeChangeCounts, setJobScopeChangeCounts] = useState<
    Map<string, { added: number; removed: number }>
  >(new Map());

  const cpsManager = countsDependencies?.cpsManager;
  const selectedProjectRouting = countsDependencies?.selectedProjectRouting;

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      return cpsManager?.fetchProjects(routing) ?? Promise.resolve(null);
    },
    [cpsManager]
  );

  const {
    originProject,
    linkedProjects,
    isLoading: isSelectedProjectsLoading,
  } = useFetchProjects(fetchProjects, selectedProjectRouting as ProjectRouting | undefined);

  const selectedProjects = useMemo(
    () => getProjectAliasesFromProjects(originProject, linkedProjects),
    [originProject, linkedProjects]
  );

  useEffect(() => {
    async function fetchData() {
      if (!countsDependencies || isSelectedProjectsLoading) {
        return;
      }
      const { jobIds, getJobs } = countsDependencies;
      const jobs = await getJobs(jobIds);

      const jobScopesEntries = await Promise.all(
        jobs.map(async (job): Promise<[string, string[]]> => {
          const projectRouting = job.datafeed_config.project_routing;
          if (!projectRouting) {
            return [job.job_id, []];
          }
          const projectsData = await fetchProjects(projectRouting as ProjectRouting);
          return [job.job_id, getProjectAliasesFromProjectsData(projectsData)];
        })
      );

      const changeCounts = new Map<string, { added: number; removed: number }>();
      for (const [jobId, currentScope] of jobScopesEntries) {
        changeCounts.set(jobId, getScopeChangeCounts(currentScope, selectedProjects));
      }
      setJobScopeChangeCounts(changeCounts);
    }

    fetchData();
  }, [countsDependencies, fetchProjects, isSelectedProjectsLoading, selectedProjects]);

  const modalTitle = useMemo(() => {
    if (!countsDependencies) {
      return i18n.translate(
        'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalTitle.noJobIds',
        {
          defaultMessage: 'Update project scope?',
        }
      );
    }

    if (countsDependencies?.jobIds.length === 1) {
      return i18n.translate(
        'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalTitle.singleJob',
        {
          defaultMessage: 'Change project scope for {jobId}?',
          values: {
            jobId: countsDependencies.jobIds[0],
          },
        }
      );
    }

    return i18n.translate(
      'xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalTitle.multipleJobs',
      {
        defaultMessage: 'Change project scope for {count} jobs?',
        values: {
          count: countsDependencies?.jobIds.length,
        },
      }
    );
  }, [countsDependencies]);

  return (
    <EuiModal
      maxWidth={euiTheme.breakpoint.s}
      onClose={onCancel}
      aria-labelledby={confirmModalTitleId}
      data-test-subj="mlUpdateAdJobsProjectRoutingConfirmModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={confirmModalTitleId}>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalBody"
            defaultMessage="The model for this job was trained on a specific set of data. Changing this data set may cause temporary model instability and an increase in false-positives. Are you sure you want to apply these changes?"
          />
        </EuiText>

        {countsDependencies && countsDependencies.jobIds.length > 1 ? (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h6>
                <FormattedMessage
                  id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.affectedJobsTitle"
                  defaultMessage="Affected jobs"
                />
              </h6>
            </EuiTitle>

            <EuiSpacer size="xs" />
            <EuiPanel
              paddingSize="s"
              hasBorder={false}
              hasShadow={false}
              color="subdued"
              css={{ maxHeight: '250px', overflowY: 'auto' }}
            >
              {countsDependencies.jobIds.map((jobId, index) => {
                const counts = jobScopeChangeCounts.get(jobId) ?? { added: 0, removed: 0 };

                return (
                  <React.Fragment key={jobId}>
                    <EuiFlexGroup
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
                    {index < countsDependencies.jobIds.length - 1 ? <EuiSpacer size="s" /> : null}
                  </React.Fragment>
                );
              })}
            </EuiPanel>
          </>
        ) : null}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          data-test-subj="mlUpdateAdJobsProjectRoutingConfirmModalCancel"
        >
          <FormattedMessage
            id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalCancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onConfirm}
          data-test-subj="mlUpdateAdJobsProjectRoutingConfirmModalConfirm"
        >
          <FormattedMessage
            id="xpack.ml.embeddables.updateADJobsProjectRoutingFlyout.confirmModalConfirm"
            defaultMessage="Yes, save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
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
