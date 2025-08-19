/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSteps, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { conversationRoundsId } from '../../conversation_rounds.styles';
import { QueryResultStep } from './query_result_step';
// import { ResourceResultStep } from './resource_result_step';
import { TabularDataResultStep } from './tabular_data_result_step';

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
  return (
    <EuiCodeBlock
      language="json"
      fontSize="s"
      paddingSize="s"
      isCopyable={false}
      transparentBackground
    >
      {JSON.stringify(toolResult, null, 2)}
    </EuiCodeBlock>
  );
};

interface RoundStepsProps {
  toolResults: ToolResult[];
}

export const RoundSteps: React.FC<RoundStepsProps> = ({ toolResults }) => {
  const { euiTheme } = useEuiTheme();
  const stepsStyles = css`
    .euiStep {
      display: flex;
    }
    .euiStep__titleWrapper {
      display: block;
    }
    .euiStep__content {
      padding-block: 0;
      padding-inline: ${euiTheme.size.m};
      padding-bottom: ${euiTheme.size.m};
      margin: 0;
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
      steps={toolResults.map((toolResult) => {
        return {
          title: '',
          children: <ToolResultDisplay toolResult={toolResult} />,
          status: 'incomplete',
        };
      })}
    />
  );
};
