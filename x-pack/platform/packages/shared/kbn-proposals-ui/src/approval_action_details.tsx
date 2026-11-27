/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IBasePath } from '@kbn/core-http-browser';
import { resolveAppHref } from './markdown_link';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import type { ApprovalProposal } from './types';

interface ApprovalActionDetailsProps {
  proposal: ApprovalProposal;
  /** See `ApprovalContentProps.basePath`. */
  basePath?: IBasePath;
  'data-test-subj'?: string;
}

const WORKFLOWS_APP_PATH = '/app/workflows';

/** The Workflows app page for one workflow, optionally opened on one of its executions. */
export const getWorkflowPath = (workflowId: string, executionId?: string): string => {
  const base = `${WORKFLOWS_APP_PATH}/${encodeURIComponent(workflowId)}`;
  return executionId
    ? `${base}?tab=executions&executionId=${encodeURIComponent(executionId)}`
    : base;
};

/**
 * What an action proposal will run, so the analyst knows what they are approving: the workflow
 * (linked), the exact input it will be called with (collapsed, since it is raw JSON), and once it
 * has run, a link to that execution. Renders nothing for a proposal with no action.
 */
export const ApprovalActionDetails = memo<ApprovalActionDetailsProps>(
  ({ proposal, basePath, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const accordionId = useGeneratedHtmlId({ prefix: 'ApprovalActionInput' });
    const { actionWorkflowId, actionInput, actionExecutionId, action } = proposal;

    const inputJson = useMemo(
      () => (actionInput === undefined ? undefined : JSON.stringify(actionInput, null, 2)),
      [actionInput]
    );

    if (!actionWorkflowId) {
      return null;
    }

    const testSubj = (suffix: string) => (dataTestSubj ? `${dataTestSubj}-${suffix}` : undefined);

    return (
      <div
        css={css({
          marginBottom: euiTheme.size.m,
          padding: euiTheme.size.s,
          border: euiTheme.border.thin,
          borderRadius: euiTheme.border.radius.medium,
        })}
        data-test-subj={testSubj('actionDetails')}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiIcon type="workflow" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {APPROVAL_MODAL_TRANSLATIONS.actionWorkflowLabel}{' '}
              <EuiLink
                href={resolveAppHref(getWorkflowPath(actionWorkflowId), basePath)}
                target="_blank"
                data-test-subj={testSubj('workflowLink')}
              >
                {action?.name ?? actionWorkflowId}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
          {actionExecutionId && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiLink
                  href={resolveAppHref(
                    getWorkflowPath(actionWorkflowId, actionExecutionId),
                    basePath
                  )}
                  target="_blank"
                  data-test-subj={testSubj('executionLink')}
                >
                  {APPROVAL_MODAL_TRANSLATIONS.viewExecution}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {inputJson !== undefined && (
          <EuiAccordion
            id={accordionId}
            buttonContent={
              <EuiText size="xs">{APPROVAL_MODAL_TRANSLATIONS.actionInputToggle}</EuiText>
            }
            paddingSize="none"
            css={css({ marginTop: euiTheme.size.xs })}
            data-test-subj={testSubj('actionInput')}
          >
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="s"
              overflowHeight={240}
              isCopyable
              data-test-subj={testSubj('actionInputCode')}
            >
              {inputJson}
            </EuiCodeBlock>
          </EuiAccordion>
        )}
      </div>
    );
  }
);

ApprovalActionDetails.displayName = 'ApprovalActionDetails';
