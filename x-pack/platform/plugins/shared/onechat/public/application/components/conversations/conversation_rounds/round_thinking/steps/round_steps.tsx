/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRoundStep,
  ToolCallProgress,
  ToolCallStep,
} from '@kbn/onechat-common/chat/conversation';
import { isReasoningStep, isToolCallStep } from '@kbn/onechat-common/chat/conversation';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { TabularDataResultStep } from './tabular_data_result_step';
import { OtherResultStep } from './other_result_step';
import { QueryResultStep } from './query_result_step';

interface ToolResultDisplayProps {
  toolResult: ToolResult;
}

const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolResult }) => {
  switch (toolResult.type) {
    // TODO: Add resource result step once we can reliably access the reference ID
    // case ToolResultType.resource:
    //   return <ResourceResultStep result={toolResult} />;
    case ToolResultType.query:
      return <QueryResultStep result={toolResult} />;
    case ToolResultType.tabularData:
      return <TabularDataResultStep result={toolResult} />;
    default:
      // Other results
      // Also showing Resource results as Other results for now as JSON blobs
      return <OtherResultStep result={toolResult} />;
  }
};

const StepLabel: React.FC<{ value?: string; href?: string }> = ({ value, href }) => {
  if (!value) {
    return null;
  }
  if (href) {
    return <EuiLink href={href}>{value}</EuiLink>;
  }
  return (
    <EuiText>
      <p>{value}</p>
    </EuiText>
  );
};

interface ThinkingItemLayoutProps {
  content: ReactNode;
  label: { value?: string; href?: string };
}

const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({
  content,
  label: { value, href },
}) => {
  return (
    // No gap because we're using the margin on the horizontal divider
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem>{content}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StepLabel value={value} href={href} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ToolCallDisplay: React.FC<{
  step: ToolCallStep;
  agentId?: string;
  agentHref?: string;
  toolHref: string;
}> = ({ step, agentId, agentHref, toolHref }) => {
  return (
    <ThinkingItemLayout
      content={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.onechat.thinking.toolCallThinkingItem"
              defaultMessage="Calling tool "
            />
            <code>
              <EuiLink href={toolHref} target="_blank">
                {step.tool_id}
              </EuiLink>
            </code>
          </p>
        </EuiText>
      }
      label={{
        value: agentId,
        href: agentHref,
      }}
    />
  );
};

const ToolProgressDisplay: React.FC<{
  progress: ToolCallProgress;
  toolId: string;
  toolHref: string;
}> = ({ progress, toolId, toolHref }) => {
  return (
    <ThinkingItemLayout content={progress.message} label={{ value: toolId, href: toolHref }} />
  );
};

interface RoundStepsProps {
  steps: ConversationRoundStep[];
}

const labels = {
  roundThinkingSteps: i18n.translate('xpack.onechat.conversation.thinking.stepsList', {
    defaultMessage: 'Round thinking steps',
  }),
};

const getProgressionItems = ({ step, toolHref }: { step: ToolCallStep; toolHref: string }) => {
  return (
    step.progression?.map((progress, index) => (
      <ToolProgressDisplay
        key={`${step.tool_id}-progress-${index}`}
        progress={progress}
        toolId={step.tool_id}
        toolHref={toolHref}
      />
    )) ?? []
  );
};

const getResultItems = ({ step, toolHref }: { step: ToolCallStep; toolHref: string }) => {
  return step.results.map((result: ToolResult, index) => (
    <ThinkingItemLayout
      key={`${step.tool_id}-result-${index}`}
      content={<ToolResultDisplay toolResult={result} />}
      label={{ value: step.tool_id, href: toolHref }}
    />
  ));
};

export const RoundSteps: React.FC<RoundStepsProps> = ({ steps }) => {
  const stepsListStyles = css`
    list-style: none;
    padding: none;
  `;
  const agentId = useAgentId();
  const { createOnechatUrl } = useNavigation();
  const agentHref = agentId && createOnechatUrl(appPaths.agents.edit({ agentId }));
  const createToolUrl = ({ toolId }: { toolId: string }) =>
    createOnechatUrl(appPaths.tools.details({ toolId }));

  // Each step will map to multiple thinking items
  // In the case of tool call steps we'll have
  // an item for the tool call, items for the progression, and items for the tool call results
  return (
    <ol css={stepsListStyles} aria-label={labels.roundThinkingSteps}>
      {steps.flatMap((step, index): ReactNode => {
        if (isToolCallStep(step)) {
          return [
            <ToolCallDisplay
              key={`step-tool-call-${index}`}
              step={step}
              agentId={agentId}
              agentHref={agentHref}
              toolHref={createToolUrl({ toolId: step.tool_id })}
            />,
            ...getProgressionItems({ step, toolHref: createToolUrl({ toolId: step.tool_id }) }),
            ...getResultItems({ step, toolHref: createToolUrl({ toolId: step.tool_id }) }),
          ];
        }

        // What is the difference between a reasoning step and a tool call progression message. When does the agent produce one over the other?
        // Is there any difference for how we should display reasoning and progression?
        if (isReasoningStep(step)) {
          return [
            <ThinkingItemLayout
              key={`step-reasoning-${index}`}
              content={step.reasoning}
              label={{ value: agentId, href: agentHref }}
            />,
          ];
        }

        return [];
      })}
    </ol>
  );
};
