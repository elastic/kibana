/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { css } from '@emotion/react';

import * as i18n from './translations';

const QuickPromptsFlexGroup = styled(EuiFlexGroup)`
  margin: 16px;
`;

interface QuickPrompt {
  title: string;
  prompt: string;
  color: string;
}
const quickPrompts: QuickPrompt[] = [
  {
    title: i18n.ALERT_SUMMARIZATION_TITLE,
    prompt: i18n.ALERT_SUMMARIZATION_PROMPT,
    color: 'accent',
  },
  { title: i18n.RULE_CREATION_TITLE, prompt: i18n.RULE_CREATION_PROMPT, color: 'success' },
  { title: i18n.WORKFLOW_ANALYSIS_TITLE, prompt: i18n.WORKFLOW_ANALYSIS_PROMPT, color: 'primary' },
  {
    title: i18n.THREAT_INVESTIGATION_GUIDES_TITLE,
    prompt: i18n.THREAT_INVESTIGATION_GUIDES_PROMPT,
    color: 'warning',
  },
  { title: i18n.OMNI_QUERY_5000_TITLE, prompt: i18n.OMNI_QUERY_5000_PROMPT, color: '#BADA55' },
];
interface QuickPromptsProps {
  setInput: (input: string) => void;
}
export const QuickPrompts: React.FC<QuickPromptsProps> = React.memo(({ setInput }) => {
  return (
    <QuickPromptsFlexGroup gutterSize="s" alignItems="center">
      {quickPrompts.map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiBadge
            color={badge.color}
            onClick={() => setInput(badge.prompt)}
            onClickAriaLabel={badge.title}
            css={css``}
          >
            {/* <EuiText size="s">{badge.title}</EuiText>*/}
            {badge.title}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </QuickPromptsFlexGroup>
  );
});
QuickPrompts.displayName = 'QuickPrompts';
