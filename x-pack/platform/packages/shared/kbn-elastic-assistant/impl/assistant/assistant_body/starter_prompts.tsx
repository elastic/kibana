/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { PromptItemArray } from '@kbn/elastic-assistant-common/impl/schemas/security_ai_prompts/common_attributes.gen';
import { useAssistantContext, useFindPrompts } from '../../..';

interface Props {
  connectorId?: string;
  compressed?: boolean;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
}
const starterPromptClassName = css`
  max-width: 50%;
  min-width: calc(50% - 8px);
`;

const starterPromptInnerClassName = css`
  text-align: center !important;
`;
interface PromptGroup {
  description: string;
  title: string;
  icon: string;
  prompt: string;
}
// these are the promptIds (Security AI Prompts integration) for each of the starter prompts fields
export const promptGroups = [
  {
    title: 'starterPromptTitle1',
    description: 'starterPromptDescription1',
    icon: 'starterPromptIcon1',
    prompt: 'starterPromptPrompt1',
  },
  {
    description: 'starterPromptDescription2',
    title: 'starterPromptTitle2',
    icon: 'starterPromptIcon2',
    prompt: 'starterPromptPrompt2',
  },
  {
    description: 'starterPromptDescription3',
    title: 'starterPromptTitle3',
    icon: 'starterPromptIcon3',
    prompt: 'starterPromptPrompt3',
  },
  {
    description: 'starterPromptDescription4',
    title: 'starterPromptTitle4',
    icon: 'starterPromptIcon4',
    prompt: 'starterPromptPrompt4',
  },
];

export const StarterPrompts: React.FC<Props> = ({
  compressed = false,
  connectorId,
  setUserPrompt,
}) => {
  const {
    assistantAvailability: { isAssistantEnabled },
    assistantTelemetry,
    http,
    toasts,
  } = useAssistantContext();
  const {
    data: { prompts: actualPrompts },
  } = useFindPrompts({
    context: {
      isAssistantEnabled,
      httpFetch: http.fetch,
      toasts,
    },
    params: {
      connector_id: connectorId,
      prompt_group_id: 'aiAssistant',
      prompt_ids: getAllPromptIds(promptGroups),
    },
  });

  const fetchedPromptGroups = useMemo(() => {
    if (!actualPrompts.length) {
      return [];
    }
    return formatPromptGroups(actualPrompts);
  }, [actualPrompts]);

  const trackPrompt = useCallback(
    (promptTitle: string) => {
      assistantTelemetry?.reportAssistantStarterPrompt({
        promptTitle,
      });
    },
    [assistantTelemetry]
  );

  const onSelectPrompt = useCallback(
    (prompt: string, title: string) => {
      setUserPrompt(prompt);
      trackPrompt(title);
    },
    [setUserPrompt, trackPrompt]
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="m" wrap>
      {fetchedPromptGroups.map(({ description, title, icon, prompt }) => (
        <EuiFlexItem key={prompt} className={starterPromptClassName}>
          <EuiPanel
            paddingSize={compressed ? 's' : 'm'}
            hasShadow={false}
            hasBorder
            data-test-subj={prompt}
            onClick={() => onSelectPrompt(prompt, title)}
            className={starterPromptInnerClassName}
          >
            <EuiSpacer size="s" />
            <EuiIcon type={icon} size={compressed ? 'm' : 'xl'} />
            <EuiSpacer size="s" />
            <EuiText size={compressed ? 'xs' : 's'}>
              <h3>{title}</h3>
              <p>{description}</p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const getAllPromptIds = (pGroups: PromptGroup[]) => {
  return pGroups.map((promptGroup: PromptGroup) => [...Object.values(promptGroup)]).flat();
};

export const formatPromptGroups = (actualPrompts: PromptItemArray): PromptGroup[] =>
  promptGroups.reduce<PromptGroup[]>((acc, promptGroup) => {
    const foundPrompt = (field: keyof PromptGroup) =>
      actualPrompts.find((p) => p.promptId === promptGroup[field])?.prompt;
    const toBePrompt = {
      prompt: foundPrompt('prompt'),
      icon: foundPrompt('icon'),
      title: foundPrompt('title'),
      description: foundPrompt('description'),
    };
    if (toBePrompt.prompt && toBePrompt.icon && toBePrompt.title && toBePrompt.description) {
      acc.push(toBePrompt as PromptGroup);
    }
    return acc;
  }, []);
