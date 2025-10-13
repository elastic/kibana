/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationWithoutRounds } from '@kbn/onechat-common';
import { EvaluationSections } from './evaluation_sections';

const sidebarContainerStyles = css`
  block-size: 100%;
`;
const loadingStyles = css`
  align-self: center;
  justify-content: center;
`;

interface EvaluationsSidebarProps {
  conversations: ConversationWithoutRounds[];
  isLoading: boolean;
}

export const EvaluationsSidebar: React.FC<EvaluationsSidebarProps> = ({
  conversations,
  isLoading,
}) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = css`
    ${useEuiOverflowScroll('y')}
  `;
  const conversationsContainerStyles = css`
    padding: ${euiTheme.size.base};
  `;
  return (
    <EuiFlexGroup css={sidebarContainerStyles} direction="column">
      {isLoading ? (
        <EuiFlexItem css={loadingStyles}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem css={scrollStyles}>
          <EuiFlexGroup
            css={conversationsContainerStyles}
            direction="column"
            gutterSize="l"
            aria-label={i18n.translate('xpack.onechat.conversationSidebar.conversations', {
              defaultMessage: 'Conversations',
            })}
          >
            <EvaluationSections conversations={conversations} />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
