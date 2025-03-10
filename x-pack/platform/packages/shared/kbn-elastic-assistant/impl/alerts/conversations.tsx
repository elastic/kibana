/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

interface Props {
  id?: string;
}

const conversations = ['Conversation 1', 'Conversation 2', 'Conversation 3'];
export const Conversations: React.FC<Props> = ({ id }) => {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.AI_ASSISTANT}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel paddingSize="s" color="subdued" hasBorder={true}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>{i18n.YOUR_CONVERSATIONS}</p>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="hollow"
                  css={css`
                    color: ${euiTheme.colors.textPrimary};
                  `}
                >
                  {'3'}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonEmpty iconSide="right" iconType="arrowDown" onClick={togglePopover}>
                  {i18n.VIEW}
                </EuiButtonEmpty>
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel>
                {conversations.map((conversation, index) => (
                  <EuiContextMenuItem key={index} onClick={closePopover}>
                    {conversation}
                  </EuiContextMenuItem>
                ))}
              </EuiContextMenuPanel>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
