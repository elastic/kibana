/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
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
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING, projectRoutingCodec, type CPSProject } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';

import type { TransformListRow } from '../../../../common';
import type { ProjectScopeAction } from './use_project_scope_action';

const MAX_TRANSFORM_LIST_HEIGHT = 200;

const getEffectiveProjectRouting = (projectRouting?: ProjectRouting): ProjectRouting =>
  projectRouting ?? PROJECT_ROUTING.ORIGIN;

const projectMatchesFilterExpression = (
  project: CPSProject,
  expression: ReturnType<typeof projectRoutingCodec.decode>['filterExpressions'][number]
): boolean => {
  const projectValue = project[expression.tagName as keyof CPSProject];

  switch (expression.operator) {
    case 'is':
      return projectValue === expression.tagValue;
    case 'not':
      return projectValue !== undefined && projectValue !== expression.tagValue;
    case 'oneOf':
      return (
        typeof projectValue === 'string' &&
        Array.isArray(expression.tagValue) &&
        expression.tagValue.includes(projectValue)
      );
    case 'notOneOf':
      return (
        typeof projectValue === 'string' &&
        Array.isArray(expression.tagValue) &&
        !expression.tagValue.includes(projectValue)
      );
    case 'exists':
      return projectValue !== undefined && projectValue !== '';
    case 'notExists':
      return projectValue === undefined || projectValue === '';
  }
};

const getIncludedProjectIds = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting: ProjectRouting;
}): string[] | undefined => {
  const availableProjectIds = availableProjects.map(({ _id: projectId }) => projectId);

  if (projectRouting === PROJECT_ROUTING.ALL) {
    return availableProjectIds;
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return originProjectId ? [originProjectId] : undefined;
  }

  const decodedProjectRouting = projectRoutingCodec.decode(projectRouting);
  const filteredProjectIds =
    decodedProjectRouting.filterExpressions.length > 0
      ? availableProjects
          .filter((project) =>
            decodedProjectRouting.filterExpressions.every((expression) =>
              projectMatchesFilterExpression(project, expression)
            )
          )
          .map(({ _id: projectId }) => projectId)
      : availableProjectIds;

  if (decodedProjectRouting.selectedProjectIds.length > 0) {
    return decodedProjectRouting.selectedProjectIds.filter((projectId) =>
      filteredProjectIds.includes(projectId)
    );
  }

  if (decodedProjectRouting.excludedProjectIds.length > 0) {
    return filteredProjectIds.filter(
      (projectId) => !decodedProjectRouting.excludedProjectIds.includes(projectId)
    );
  }

  if (decodedProjectRouting.filterExpressions.length > 0) {
    return filteredProjectIds;
  }
};

const getProjectScopeDelta = ({
  nextProjectIds,
  previousProjectIds,
}: {
  nextProjectIds: string[];
  previousProjectIds: string[];
}) => {
  const nextProjectIdsSet = new Set(nextProjectIds);
  const previousProjectIdsSet = new Set(previousProjectIds);

  return {
    added: nextProjectIds.filter((projectId) => !previousProjectIdsSet.has(projectId)).length,
    removed: previousProjectIds.filter((projectId) => !nextProjectIdsSet.has(projectId)).length,
  };
};

const ProjectScopeDelta: FC<{
  availableProjects: CPSProject[];
  item: TransformListRow;
  originProjectId?: string;
  projectRouting: ProjectRouting;
}> = ({ availableProjects, item, originProjectId, projectRouting }) => {
  const previousProjectIds = getIncludedProjectIds({
    availableProjects,
    originProjectId,
    projectRouting: getEffectiveProjectRouting(item.config.source.project_routing),
  });
  const nextProjectIds = getIncludedProjectIds({
    availableProjects,
    originProjectId,
    projectRouting,
  });

  if (previousProjectIds === undefined || nextProjectIds === undefined) {
    return null;
  }

  const { added, removed } = getProjectScopeDelta({
    nextProjectIds,
    previousProjectIds,
  });

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={added > 0 ? 'success' : 'subdued'}>
          +{added}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={removed > 0 ? 'danger' : 'subdued'}>
          -{removed}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ProjectScopeActionModal: FC<ProjectScopeAction> = ({
  availableProjects,
  closeModal,
  confirmAndCloseModal,
  items,
  originProjectId,
  targetProjectRouting,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      data-test-subj="transformBulkProjectScopeModal"
      title={i18n.translate('xpack.transform.transformList.projectScopeModalTitle', {
        defaultMessage:
          'Change project scope for {count} {count, plural, one {transform} other {transforms}}?',
        values: { count: items.length },
      })}
      onCancel={closeModal}
      onConfirm={confirmAndCloseModal}
      cancelButtonText={i18n.translate(
        'xpack.transform.transformList.projectScopeModalCancelButton',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.transform.transformList.projectScopeModalConfirmButton',
        {
          defaultMessage: 'Yes, save',
        }
      )}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      aria-labelledby={confirmModalTitleId}
      titleProps={{ id: confirmModalTitleId }}
      maxWidth={576}
    >
      <EuiText size="xs" css={{ marginBottom: 4 }}>
        <p>
          <strong>
            {i18n.translate(
              'xpack.transform.transformList.projectScopeModalAffectedTransformsTitle',
              {
                defaultMessage: 'Affected transforms',
              }
            )}
          </strong>
        </p>
      </EuiText>
      <EuiPanel
        color="subdued"
        css={{ maxHeight: MAX_TRANSFORM_LIST_HEIGHT, overflowY: 'auto' }}
        data-test-subj="transformBulkProjectScopeModalTransformList"
        paddingSize="s"
        hasShadow={false}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              justifyContent="spaceBetween"
              responsive={false}
            >
              <EuiFlexItem>
                <EuiText size="s">{item.id}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ProjectScopeDelta
                  availableProjects={availableProjects}
                  item={item}
                  originProjectId={originProjectId}
                  projectRouting={targetProjectRouting}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {index < items.length - 1 ? <EuiSpacer size="s" /> : null}
          </React.Fragment>
        ))}
      </EuiPanel>
    </EuiConfirmModal>
  );
};
