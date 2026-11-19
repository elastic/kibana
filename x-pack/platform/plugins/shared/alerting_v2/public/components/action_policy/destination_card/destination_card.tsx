/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchWorkflow } from '../../../hooks/use_fetch_workflow';
import { isNotFoundError } from '../../../utils/is_not_found_error';
import { getWorkflowConnectorTypes, WorkflowConnectorIcons } from './workflow_connector_icons';

interface Props {
  destination: ActionPolicyDestination;
}

export const DestinationCard = ({ destination }: Props) => {
  if (destination.type !== 'workflow') {
    return null;
  }
  return <WorkflowDestinationCard id={destination.id} />;
};

const OPEN_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.destinationCard.openWorkflow',
  { defaultMessage: 'Open workflow in a new tab' }
);

const WORKFLOW_NOT_FOUND_MESSAGE = i18n.translate(
  'xpack.alertingV2.actionPolicy.destinationCard.notFound',
  { defaultMessage: 'Workflow not found. It may have been deleted.' }
);

const WORKFLOW_LOAD_ERROR_MESSAGE = i18n.translate(
  'xpack.alertingV2.actionPolicy.destinationCard.loadError',
  { defaultMessage: 'Unable to load workflow details' }
);

const WorkflowDestinationCard = ({ id }: { id: string }) => {
  const { data: workflow, isLoading, error } = useFetchWorkflow(id, true, { notifyOnError: false });
  const application = useService(CoreStart('application'));
  const href = application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${id}` });
  const isNotFound = isNotFoundError(error);

  const renderBody = () => {
    if (isLoading) {
      return <LoadingBody />;
    }
    // Cached data stays visible when a background refetch fails, unless the workflow was deleted.
    if (workflow && !isNotFound) {
      return (
        <WorkflowBody
          name={workflow.name}
          description={workflow.description}
          connectorTypes={getWorkflowConnectorTypes(workflow.definition)}
        />
      );
    }
    return <ErrorBody id={id} isNotFound={isNotFound} />;
  };

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="actionPolicyDestinationCard"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow css={{ minWidth: 0 }}>
          {renderBody()}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={OPEN_WORKFLOW_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="external"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={OPEN_WORKFLOW_LABEL}
              data-test-subj="actionPolicyDestinationCardLink"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const LoadingBody = () => (
  <div data-test-subj="actionPolicyDestinationCardLoading">
    <EuiSkeletonTitle size="xxs" />
    <EuiSkeletonText lines={1} size="xs" />
  </div>
);

const ErrorBody = ({ id, isNotFound }: { id: string; isNotFound: boolean }) => (
  <>
    <CardTitle name={id} />
    <EuiText
      size="xs"
      color="danger"
      data-test-subj={
        isNotFound ? 'actionPolicyDestinationCardNotFound' : 'actionPolicyDestinationCardError'
      }
    >
      {isNotFound ? WORKFLOW_NOT_FOUND_MESSAGE : WORKFLOW_LOAD_ERROR_MESSAGE}
    </EuiText>
  </>
);

interface WorkflowBodyProps {
  name: string;
  description?: string;
  connectorTypes: string[];
}

const WorkflowBody = ({ name, description, connectorTypes }: WorkflowBodyProps) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
        <CardTitle name={name} />
      </EuiFlexItem>
      {connectorTypes.length > 0 && (
        <EuiFlexItem grow={false}>
          <WorkflowConnectorIcons types={connectorTypes} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    {description && (
      <EuiText
        size="xs"
        color="subdued"
        className="eui-textTruncate"
        data-test-subj="actionPolicyDestinationCardDescription"
      >
        {description}
      </EuiText>
    )}
  </>
);

const CardTitle = ({ name }: { name: string }) => (
  <EuiToolTip
    content={name}
    position="top"
    anchorProps={{ css: { minWidth: 0, overflow: 'hidden' } }}
  >
    <EuiText
      size="s"
      tabIndex={0}
      className="eui-textTruncate"
      data-test-subj="actionPolicyDestinationCardTitle"
    >
      <strong>{name}</strong>
    </EuiText>
  </EuiToolTip>
);
