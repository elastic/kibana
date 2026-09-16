/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import React, { useMemo, useState } from 'react';
import { useFetchWorkflow } from '../../../../hooks/use_fetch_workflow';

interface SelectedWorkflowCardProps {
  id: string;
  name: string;
  description?: string;
  definition?: WorkflowYaml | null;
  /**
   * When false, opens the workflow in a new browser tab instead of a nested
   * preview flyout (used by the essential create-from-rule form).
   */
  allowDetailsFlyout?: boolean;
}

const STEP_ICON_BY_TYPE: Array<{ match: RegExp; iconType: string }> = [
  { match: /slack/i, iconType: 'logoSlack' },
  { match: /email|mail/i, iconType: 'mail' },
  { match: /pagerduty/i, iconType: 'bolt' },
  { match: /webhook/i, iconType: 'logoWebhook' },
];

const collectStepTypes = (definition: WorkflowYaml | null | undefined): string[] => {
  if (!definition?.steps?.length) {
    return [];
  }

  const types: string[] = [];
  const visit = (steps: Array<{ type?: string; steps?: unknown[] }> | undefined) => {
    for (const step of steps ?? []) {
      if (typeof step.type === 'string') {
        types.push(step.type);
      }
      if (Array.isArray(step.steps)) {
        visit(step.steps as Array<{ type?: string; steps?: unknown[] }>);
      }
    }
  };

  visit(definition.steps as Array<{ type?: string; steps?: unknown[] }>);
  return types;
};

const iconsForStepTypes = (stepTypes: string[]): string[] => {
  const icons: string[] = [];
  const seen = new Set<string>();

  for (const type of stepTypes) {
    const matched = STEP_ICON_BY_TYPE.find(({ match }) => match.test(type));
    const iconType = matched?.iconType ?? 'gear';
    if (!seen.has(iconType)) {
      seen.add(iconType);
      icons.push(iconType);
    }
  }

  return icons;
};

export const SelectedWorkflowCard = ({
  id,
  name,
  description,
  definition,
  allowDetailsFlyout = true,
}: SelectedWorkflowCardProps) => {
  const application = useService(CoreStart('application'));
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'workflowPreviewFlyout' });

  const { data: workflow, isLoading, isFetching } = useFetchWorkflow(
    id,
    allowDetailsFlyout && isFlyoutOpen
  );

  const resolvedName = workflow?.name || name;
  const resolvedDescription = workflow?.description || description || '';
  const stepIcons = useMemo(
    () => iconsForStepTypes(collectStepTypes(workflow?.definition ?? definition)),
    [workflow?.definition, definition]
  );

  const workflowEditUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${id}` });
  const viewDetailsLabel = allowDetailsFlyout
    ? i18n.translate(
        'xpack.alertingV2.actionPolicy.form.destination.viewWorkflowDetailsTooltip',
        { defaultMessage: 'View workflow details' }
      )
    : i18n.translate(
        'xpack.alertingV2.actionPolicy.form.destination.openWorkflowInNewTabTooltip',
        { defaultMessage: 'Open workflow in a new tab' }
      );

  return (
    <>
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        data-test-subj={`selectedWorkflowCard-${id}`}
      >
        <EuiFlexGroup
          alignItems="flexStart"
          justifyContent="spaceBetween"
          gutterSize="m"
          responsive={false}
        >
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{resolvedName}</strong>
                </EuiText>
              </EuiFlexItem>
              {stepIcons.map((iconType, index) => (
                <EuiFlexItem grow={false} key={`${id}-${iconType}-${index}`}>
                  <EuiIcon type={iconType} size="m" aria-hidden />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            {resolvedDescription ? (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {resolvedDescription}
                </EuiText>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={viewDetailsLabel} disableScreenReaderOutput>
              {allowDetailsFlyout ? (
                <EuiButtonIcon
                  size="s"
                  color="text"
                  iconType="eye"
                  aria-label={viewDetailsLabel}
                  onClick={() => setIsFlyoutOpen(true)}
                  data-test-subj={`viewWorkflowDetails-${id}`}
                />
              ) : (
                <EuiButtonIcon
                  size="s"
                  color="text"
                  iconType="external"
                  aria-label={viewDetailsLabel}
                  href={workflowEditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj={`openWorkflowInNewTab-${id}`}
                />
              )}
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {allowDetailsFlyout && isFlyoutOpen && (
        <EuiFlyoutResizable
          onClose={() => setIsFlyoutOpen(false)}
          size="m"
          ownFocus
          aria-labelledby={flyoutTitleId}
          data-test-subj={`workflowPreviewFlyout-${id}`}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                {i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.destination.workflowPreviewTitle',
                  { defaultMessage: 'Workflow preview' }
                )}
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{resolvedName}</p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {isLoading || isFetching ? (
              <EuiFlexGroup justifyContent="center" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner
                    size="l"
                    data-test-subj={`workflowPreviewLoading-${id}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiCodeBlock
                language="yaml"
                isCopyable
                overflowHeight={500}
                fontSize="m"
                paddingSize="m"
                data-test-subj={`workflowPreviewYaml-${id}`}
              >
                {workflow?.yaml ??
                  i18n.translate(
                    'xpack.alertingV2.actionPolicy.form.destination.workflowPreviewEmpty',
                    { defaultMessage: 'No workflow definition available.' }
                  )}
              </EuiCodeBlock>
            )}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="external"
                  href={workflowEditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj={`openWorkflowButton-${id}`}
                >
                  {i18n.translate(
                    'xpack.alertingV2.actionPolicy.form.destination.openWorkflow',
                    { defaultMessage: 'Open workflow' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyoutResizable>
      )}
    </>
  );
};
