/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { useConversationRounds } from '../../hooks/use_conversation';
import { EvaluationRound } from './evaluation_round';

export const Evaluation: React.FC = () => {
  const conversationRounds = useConversationRounds();
  const { euiTheme } = useEuiTheme();

  const evaluationContainerStyles = css`
    padding: ${euiTheme.size.base};
  `;

  return (
    <div css={evaluationContainerStyles}>
      {conversationRounds.map((round, index) => (
        <React.Fragment key={round.id || index}>
          <EvaluationRound round={round} roundNumber={index + 1} />
          {index < conversationRounds.length - 1 && <EuiSpacer size="l" />}
        </React.Fragment>
      ))}
    </div>
  );
};
