/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import type { NotificationPolicyDestination } from '@kbn/alerting-v2-schemas';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { useFetchWorkflow } from '../../hooks/use_fetch_workflow';

const WorkflowDestinationLink = ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
  const application = useService(CoreStart('application'));
  const { data: workflow } = useFetchWorkflow(id, isEnabled);

  return (
    <EuiLink
      href={application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${id}` })}
      target="_blank"
      rel="noopener noreferrer"
    >
      {workflow?.name ?? id}
    </EuiLink>
  );
};

export const NotificationPolicyDestinationsSummary = ({
  destinations,
}: {
  destinations: NotificationPolicyDestination[];
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const workflowDestinations = useMemo(
    () => destinations.filter((destination) => destination.type === 'workflow'),
    [destinations]
  );

  if (workflowDestinations.length === 0) {
    return <>-</>;
  }

  const workflowCount = workflowDestinations.length;
  const summaryText =
    workflowCount === 1
      ? i18n.translate('xpack.alertingV2.notificationPolicy.destinationsSummary.singleWorkflow', {
          defaultMessage: '1 workflow',
        })
      : i18n.translate(
          'xpack.alertingV2.notificationPolicy.destinationsSummary.multipleWorkflows',
          {
            defaultMessage: '{count} workflows',
            values: { count: workflowCount },
          }
        );

  return (
    <EuiPopover
      aria-label={i18n.translate(
        'xpack.alertingV2.notificationPolicy.destinationsSummary.popoverAriaLabel',
        { defaultMessage: 'Workflow destinations' }
      )}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
      panelPaddingSize="s"
      button={
        <EuiBadge
          color="hollow"
          iconType="workflow"
          onClick={() => setIsPopoverOpen((value) => !value)}
          onClickAriaLabel={i18n.translate(
            'xpack.alertingV2.notificationPolicy.destinationsSummary.openPopoverAriaLabel',
            { defaultMessage: 'Open workflows destinations popover' }
          )}
          data-test-subj="notificationPolicyDestinationsSummaryButton"
        >
          {summaryText}
        </EuiBadge>
      }
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.alertingV2.notificationPolicy.destinationsSummary.popoverTitle', {
          defaultMessage: 'Workflows',
        })}
      </EuiPopoverTitle>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        responsive={false}
        data-test-subj="notificationPolicyDestinationsSummaryPopover"
      >
        {workflowDestinations.map(({ id }) => (
          <EuiFlexItem key={id} grow={false}>
            <EuiText size="s">
              <WorkflowDestinationLink id={id} isEnabled={isPopoverOpen} />
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPopover>
  );
};
