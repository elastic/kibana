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
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchWorkflow } from '../../../hooks/use_fetch_workflow';
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

const WorkflowDestinationCard = ({ id }: { id: string }) => {
  const { data: workflow } = useFetchWorkflow(id);
  const application = useService(CoreStart('application'));

  const name = workflow?.name ?? id;
  const description = workflow?.description;
  const href = application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${id}` });
  const connectorTypes = getWorkflowConnectorTypes(workflow?.definition);
  const hasConnectorIcons = connectorTypes.length > 0;

  const openLabel = i18n.translate('xpack.alertingV2.actionPolicy.destinationCard.openWorkflow', {
    defaultMessage: 'Open workflow in a new tab',
  });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="actionPolicyDestinationCard"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow css={{ minWidth: 0 }}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <EuiToolTip
                content={name}
                position="top"
                anchorProps={{ css: { minWidth: 0, overflow: 'hidden' } }}
              >
                <EuiText
                  size="s"
                  tabIndex={0}
                  css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  data-test-subj="actionPolicyDestinationCardTitle"
                >
                  <strong>{name}</strong>
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
            {hasConnectorIcons && (
              <EuiFlexItem grow={false}>
                <WorkflowConnectorIcons types={connectorTypes} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {description && (
            <EuiText
              size="xs"
              color="subdued"
              css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              data-test-subj="actionPolicyDestinationCardDescription"
            >
              {description}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={openLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="external"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={openLabel}
              data-test-subj="actionPolicyDestinationCardLink"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
