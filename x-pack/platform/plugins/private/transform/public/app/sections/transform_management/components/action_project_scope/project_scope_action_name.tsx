/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';
import type { TransformListRow } from '../../../../common';

export const projectScopeActionNameText = i18n.translate(
  'xpack.transform.transformList.projectScopeActionNameText',
  {
    defaultMessage: 'Change project scope',
  }
);

const unavailableProjectScopeTooltip = i18n.translate(
  'xpack.transform.transformList.projectScopeActionUnavailableTooltip',
  {
    defaultMessage: 'Project scope is unavailable.',
  }
);

const noSelectedTransformsTooltip = i18n.translate(
  'xpack.transform.transformList.projectScopeActionNoTransformsTooltip',
  {
    defaultMessage: 'Select at least one transform.',
  }
);

export const isProjectScopeActionDisabled = ({
  canCreateTransform,
  hasLinkedProjects,
  isCpsEnabled,
  isLoading,
  items,
}: {
  canCreateTransform: boolean;
  hasLinkedProjects: boolean;
  isCpsEnabled: boolean;
  isLoading: boolean;
  items: TransformListRow[];
}) => {
  return (
    !canCreateTransform || !isCpsEnabled || !hasLinkedProjects || isLoading || items.length === 0
  );
};

export const getProjectScopeActionDisabledMessage = ({
  canCreateTransform,
  hasLinkedProjects,
  isCpsEnabled,
  isLoading,
  items,
}: {
  canCreateTransform: boolean;
  hasLinkedProjects: boolean;
  isCpsEnabled: boolean;
  isLoading: boolean;
  items: TransformListRow[];
}) => {
  if (items.length === 0) {
    return noSelectedTransformsTooltip;
  }

  if (!canCreateTransform) {
    return createCapabilityFailureMessage('canCreateTransform');
  }

  if (!isCpsEnabled || !hasLinkedProjects || isLoading) {
    return unavailableProjectScopeTooltip;
  }
};

export interface ProjectScopeActionNameProps {
  canCreateTransform: boolean;
  disabled: boolean;
  hasLinkedProjects: boolean;
  isCpsEnabled: boolean;
  isLoading: boolean;
  items: TransformListRow[];
}

export const ProjectScopeActionName: FC<ProjectScopeActionNameProps> = ({
  canCreateTransform,
  disabled,
  hasLinkedProjects,
  isCpsEnabled,
  isLoading,
  items,
}) => {
  const content = getProjectScopeActionDisabledMessage({
    canCreateTransform,
    hasLinkedProjects,
    isCpsEnabled,
    isLoading,
    items,
  });

  if (disabled && content) {
    return (
      <EuiToolTip position="top" content={content}>
        <span tabIndex={0}>{projectScopeActionNameText}</span>
      </EuiToolTip>
    );
  }

  return <>{projectScopeActionNameText}</>;
};
