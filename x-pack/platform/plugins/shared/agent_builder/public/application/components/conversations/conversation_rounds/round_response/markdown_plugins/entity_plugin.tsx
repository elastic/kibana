/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import type { SyntheticEvent } from 'react';
import React, { useCallback } from 'react';
import {
  EuiCode,
  EuiText,
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import {
  type EntityElementAttributes,
  type EntityResult,
  entityElement,
  ToolResultType,
} from '@kbn/agent-builder-common/tools/tool_result';

import { useKibana } from '../../../../../hooks/use_kibana';
import { createTagParser, findToolResult } from './utils';

export const entityTagParser = createTagParser({
  tagName: entityElement.tagName,
  getAttributes: (value, extractAttr) => ({
    toolResultId: extractAttr(value, entityElement.attributes.toolResultId),
  }),
  assignAttributes: (node, attributes) => {
    node.type = entityElement.tagName;
    node.toolResultId = attributes.toolResultId;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: entityElement.tagName,
    toolResultId: attributes.toolResultId,
    position,
  }),
});

const EntityCard: React.FC<{
  id: string;
  type: string;
  score?: number;
  link?: { path: string; deepLinkId: string };
}> = ({ id, type, score, link }) => {
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xxl};
    height: ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const panelStyles = css`
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
  `;

  const iconType =
    type === 'user'
      ? 'user'
      : type === 'host'
      ? 'display'
      : type === 'service'
      ? 'gear'
      : 'question';

  const onClickHandler = useCallback(
    (ev: SyntheticEvent) => {
      ev.preventDefault();
      navigateToApp('securitySolutionUI', {
        deepLinkId: link!.deepLinkId,
        path: link!.path,
      });
    },
    [link, navigateToApp]
  );

  const cardContent = (
    <EuiPanel hasShadow={false} paddingSize="m" color="primary" className={panelStyles}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <div className={iconContainerStyles}>
            <EuiIcon type={iconType} size="xl" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="m" color="default">
            <strong>{id}</strong>
          </EuiText>
          <EuiText size="xs" color="default">
            {type}
          </EuiText>
        </EuiFlexItem>
        {score && (
          <EuiFlexItem grow={false}>
            <div className={iconContainerStyles}>
              <EuiText color="default" textAlign="center">
                <h1>{score.toFixed(0)}</h1>
              </EuiText>
            </div>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (link) {
    return <EuiLink onClick={onClickHandler}>{cardContent}</EuiLink>;
  }

  return cardContent;
};

export function createEntityRenderer({
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: EntityElementAttributes) => {
    const { toolResultId } = props;

    if (!toolResultId) {
      return <EuiText>Entity missing {entityElement.attributes.toolResultId}.</EuiText>;
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];
    const toolResult = findToolResult<EntityResult>(steps, toolResultId, ToolResultType.entity);

    if (!toolResult) {
      const ToolResultAttribute = (
        <EuiCode>
          {entityElement.attributes.toolResultId}={toolResultId}
        </EuiCode>
      );
      return <EuiText>Unable to find entity for {ToolResultAttribute}.</EuiText>;
    }

    const { id, type, link, score } = toolResult.data;

    return (
      <>
        <EntityCard id={id} type={type} score={score} link={link} />
        <EuiSpacer size="m" />
      </>
    );
  };
}
