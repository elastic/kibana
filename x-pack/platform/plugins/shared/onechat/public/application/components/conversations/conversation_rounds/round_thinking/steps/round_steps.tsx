/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSteps, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConversationRoundStep } from '@kbn/onechat-common/chat/conversation';
import { isReasoningStep, isToolCallStep } from '@kbn/onechat-common/chat/conversation';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { conversationRoundsId } from '../../conversation_rounds.styles';
import { QueryResultStep } from './query_result_step';
import { OtherResultStep } from './other_result_step';
import { TabularDataResultStep } from './tabular_data_result_step';

const resourceResultTitle = i18n.translate(
  'xpack.onechat.conversation.thinking.resourceResult.title',
  {
    defaultMessage: 'Found document(s)',
  }
);
const tabularResultTitle = i18n.translate(
  'xpack.onechat.conversation.thinking.tabularResult.title',
  {
    defaultMessage: 'Table result',
  }
);
const queryResultTitle = i18n.translate('xpack.onechat.conversation.thinking.queryResult.title', {
  defaultMessage: 'Query result',
});
const otherResultTitle = i18n.translate('xpack.onechat.conversation.thinking.otherResult.title', {
  defaultMessage: 'Other result',
});

const getToolResultTitle = (toolResult: ToolResult) => {
  if (toolResult.type === ToolResultType.resource) {
    return resourceResultTitle;
  }
  if (toolResult.type === ToolResultType.tabularData) {
    return tabularResultTitle;
  }
  if (toolResult.type === ToolResultType.query) {
    return queryResultTitle;
  }
  return otherResultTitle;
};

interface ToolResultDisplayProps {
  toolResult: ToolResult;
}

const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolResult }) => {
  // TODO: Add resource result step once we can reliably access the reference ID
  // if (toolResult.type === ToolResultType.resource) {
  //   return <ResourceResultStep result={toolResult} />;
  // }
  if (toolResult.type === ToolResultType.query) {
    return <QueryResultStep result={toolResult} />;
  }
  if (toolResult.type === ToolResultType.tabularData) {
    return <TabularDataResultStep result={toolResult} />;
  }

  // Other results
  // Also showing Resource results as Other results for now as JSON blobs
  return <OtherResultStep result={toolResult} />;
};

interface RoundStepsProps {
  steps: ConversationRoundStep[];
}

export const RoundSteps: React.FC<RoundStepsProps> = ({ steps }) => {
  const { euiTheme } = useEuiTheme();
  const stepsStyles = css`
    .euiTitle {
      ${useEuiFontSize('s')}
      font-weight: ${euiTheme.font.weight.regular};

      /*
      Align the title with the step bullet
      I can't find any other way to do this, vertical-align doesn't work here
      */
      position: relative;
      top: -2px;
    }

    .euiStepNumber,
    /* Using id for higher specificity to override the default border color */
    #${conversationRoundsId} & .euiStep::before {
      border-color: ${euiTheme.colors.borderBasePlain};
    }
  `;

  return (
    <EuiSteps
      css={stepsStyles}
      titleSize="xxs"
      steps={steps.flatMap((step) => {
        if (isToolCallStep(step)) {
          return step.results.map((toolResult) => {
            return {
              title: getToolResultTitle(toolResult),
              children: <ToolResultDisplay toolResult={toolResult} />,
              status: 'incomplete',
            };
          });
        }

        // Are reasoning steps produced at all right now?
        if (isReasoningStep(step)) {
          return [
            {
              title: step.reasoning,
              // For reasoning, the title is the content so render nothing
              children: <></>,
              status: 'incomplete',
            },
          ];
        }

        return [];
      })}
    />
  );
};
