/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';

import styled from 'styled-components';
import { Actions } from '../../../../../../../../actions';

export const CopyToClipboardButton = styled(EuiButtonEmpty)`
  margin-left: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  markdownComment: string;
  showAddToNewCaseAction?: boolean;
  showCopyToClipboardAction?: boolean;
  showChatAction?: boolean;
  indexName?: string;
}

const StyledStickyContainer = styled.div`
  padding: ${({ theme }) => theme.eui.euiSizeL} 0;
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 1px solid ${({ theme }) => theme.eui.euiBorderColor};
`;

const StickyActionsComponent: FC<Props> = ({
  indexName,
  markdownComment,
  showCopyToClipboardAction,
  showAddToNewCaseAction,
  showChatAction,
}) => {
  return (
    <StyledStickyContainer>
      <Actions
        indexName={indexName}
        markdownComment={markdownComment}
        showChatAction={showChatAction}
        showCopyToClipboardAction={showCopyToClipboardAction}
        showAddToNewCaseAction={showAddToNewCaseAction}
      />
    </StyledStickyContainer>
  );
};

StickyActionsComponent.displayName = 'StickyActionsComponent';

export const StickyActions = React.memo(StickyActionsComponent);
