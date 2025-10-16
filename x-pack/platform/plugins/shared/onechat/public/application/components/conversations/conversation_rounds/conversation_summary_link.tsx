/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiLink,
  EuiCodeBlock,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

interface Props {
  conversationId: string;
  label: string;
}

export const ConversationSummaryLink: React.FC<Props> = ({ conversationId, label }) => {
  const [showFlyout, setShowFlyout] = useState(false);

  const toggleFlyout = () => {
    setShowFlyout(!showFlyout);
  };

  return (
    <>
      <EuiLink onClick={toggleFlyout}>{label}</EuiLink>
      <ConversationSummaryFlyout
        conversationId={conversationId}
        isOpen={showFlyout}
        onClose={toggleFlyout}
      />
    </>
  );
};

const ConversationSummaryFlyout: React.FC<{
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ conversationId, isOpen, onClose }) => {
  const { conversationsService } = useOnechatServices();

  const { data: summary } = useQuery({
    queryKey: ['conversations', 'summaries', conversationId],
    queryFn: () => {
      return conversationsService.getSummary({ conversationId });
    },
  });

  const aggrData = useMemo(() => {
    return {
      conversation_id: conversationId,
      ...summary?.structured_data,
    };
  }, [conversationId, summary]);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>Conversation Summary</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          isCopyable={true}
          css={css`
            overflow: auto;
          `}
        >
          {JSON.stringify(aggrData ?? {}, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
