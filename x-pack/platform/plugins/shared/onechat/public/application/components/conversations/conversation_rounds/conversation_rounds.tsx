/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationRound } from '@kbn/onechat-common';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Round } from './round';
import { ConversationContent } from '../conversation_grid';

interface ConversationRoundsProps {
  conversationRounds: ConversationRound[];
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({ conversationRounds }) => {
  return (
    <ConversationContent>
      <EuiFlexGroup
        direction="column"
        gutterSize="l"
        aria-label={i18n.translate('xpack.onechat.conversationRounds', {
          defaultMessage: 'Conversation messages',
        })}
      >
        {conversationRounds.map((round, index) => {
          return <Round key={index} round={round} />;
        })}
      </EuiFlexGroup>
    </ConversationContent>
  );
};
