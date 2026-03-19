/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { type RuleConfigResult, ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  ruleConfigElement,
  type RuleConfigElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import { createTagParser, findToolResult } from './utils';

export const ruleConfigTagParser = createTagParser({
  tagName: ruleConfigElement.tagName,
  getAttributes: (value, extractAttr) => ({
    toolResultId: extractAttr(value, ruleConfigElement.attributes.toolResultId),
  }),
  assignAttributes: (node, attributes) => {
    node.type = ruleConfigElement.tagName;
    node.toolResultId = attributes.toolResultId;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: ruleConfigElement.tagName,
    toolResultId: attributes.toolResultId,
    position,
  }),
});

export function createRuleConfigRenderer({
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: RuleConfigElementAttributes) => {
    const { toolResultId } = props;

    if (!toolResultId) {
      return <EuiText>Rule config missing {ruleConfigElement.attributes.toolResultId}.</EuiText>;
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];

    const toolResult = findToolResult<RuleConfigResult>(
      steps,
      toolResultId,
      ToolResultType.ruleConfig
    );

    if (!toolResult) {
      return <EuiText>Unable to find rule configuration for this result.</EuiText>;
    }

    const { name, kind, enabled, query, schedule, lookback, grouping, labels, ruleUrl } =
      toolResult.data;

    const descriptionItems = [
      { title: 'Kind', description: <EuiBadge color="hollow">{kind}</EuiBadge> },
      {
        title: 'Status',
        description: (
          <EuiBadge color={enabled ? 'success' : 'default'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </EuiBadge>
        ),
      },
      {
        title: 'Schedule',
        description: lookback ? `every ${schedule}, lookback ${lookback}` : `every ${schedule}`,
      },
    ];

    if (grouping && grouping.length > 0) {
      descriptionItems.push({
        title: 'Grouping',
        description: grouping.join(', '),
      });
    }

    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>
                <EuiLink href={ruleUrl} target="_blank">
                  {name}
                </EuiLink>
              </h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiDescriptionList
          type="column"
          compressed
          columnWidths={[1, 3]}
          listItems={descriptionItems}
        />

        <EuiSpacer size="s" />

        <EuiText size="xs" color="subdued">
          <strong>Query</strong>
        </EuiText>
        <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
          {query}
        </EuiCodeBlock>

        {labels && labels.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {labels.map((label) => (
                <EuiFlexItem grow={false} key={label}>
                  <EuiBadge>{label}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    );
  };
}
