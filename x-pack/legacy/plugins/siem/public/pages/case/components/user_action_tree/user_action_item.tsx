/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { UserActionAvatar } from './user_action_avatar';
import { UserActionTitle } from './user_action_title';
import * as i18n from './translations';

interface UserActionItemProps {
  createdAt: string;
  disabled: boolean;
  id: string;
  isEditable: boolean;
  isLoading: boolean;
  labelEditAction?: string;
  labelQuoteAction?: string;
  labelTitle?: JSX.Element;
  linkId?: string | null;
  fullName?: string | null;
  markdown?: React.ReactNode;
  onEdit?: (id: string) => void;
  onQuote?: (id: string) => void;
  username: string;
  updatedAt?: string | null;
  outlineComment?: (id: string) => void;
  showBottomFooter?: boolean;
  showTopFooter?: boolean;
  idToOutline?: string | null;
}

export const UserActionItemContainer = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    & {
      background-image: linear-gradient(
        to right,
        transparent 0,
        transparent 15px,
        ${theme.eui.euiBorderColor} 15px,
        ${theme.eui.euiBorderColor} 17px,
        transparent 17px,
        transparent 100%
      );
      background-repeat: no-repeat;
      background-position: left ${theme.eui.euiSizeXXL};
      margin-bottom: ${theme.eui.euiSizeS};
    }
    .userAction__panel {
      margin-bottom: ${theme.eui.euiSize};
    }
    .userAction__circle {
      flex-shrink: 0;
      margin-right: ${theme.eui.euiSize};
      vertical-align: top;
    }
    .userAction_loadingAvatar {
      position: relative;
      margin-right: ${theme.eui.euiSizeXL};
      top: ${theme.eui.euiSizeM};
      left: ${theme.eui.euiSizeS};
    }
    .userAction__title {
      padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};
      background: ${theme.eui.euiColorLightestShade};
      border-bottom: ${theme.eui.euiBorderThin};
      border-radius: ${theme.eui.euiBorderRadius} ${theme.eui.euiBorderRadius} 0 0;
    }
    .euiText--small * {
      margin-bottom: 0;
    }
  `}
`;

const MyEuiPanel = styled(EuiPanel)<{ showoutline: string }>`
  ${({ theme, showoutline }) =>
    showoutline === 'true'
      ? `
      outline: solid 5px ${theme.eui.euiColorVis1_behindText};
      margin: 0.5em;
      transition: 0.8s;
    `
      : ''}
`;

const PushedContainer = styled(EuiFlexItem)`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSizeS};
    margin-bottom: ${theme.eui.euiSizeXL};
    hr {
      margin: 5px;
      height: ${theme.eui.euiBorderWidthThick};
    }
  `}
`;

const PushedInfoContainer = styled.div`
  margin-left: 48px;
`;

export const UserActionItem = ({
  createdAt,
  disabled,
  id,
  idToOutline,
  isEditable,
  isLoading,
  labelEditAction,
  labelQuoteAction,
  labelTitle,
  linkId,
  fullName,
  markdown,
  onEdit,
  onQuote,
  outlineComment,
  showBottomFooter,
  showTopFooter,
  username,
  updatedAt,
}: UserActionItemProps) => (
  <UserActionItemContainer gutterSize={'none'} direction="column">
    <EuiFlexItem>
      <EuiFlexGroup gutterSize={'none'}>
        <EuiFlexItem data-test-subj={`user-action-${id}-avatar`} grow={false}>
          {(fullName && fullName.length > 0) || (username && username.length > 0) ? (
            <UserActionAvatar name={fullName && fullName.length > 0 ? fullName : username ?? ''} />
          ) : (
            <EuiLoadingSpinner className="userAction_loadingAvatar" />
          )}
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={`user-action-${id}`}>
          {isEditable && markdown}
          {!isEditable && (
            <MyEuiPanel
              className="userAction__panel"
              paddingSize="none"
              showoutline={id === idToOutline ? 'true' : 'false'}
            >
              <UserActionTitle
                createdAt={createdAt}
                disabled={disabled}
                id={id}
                isLoading={isLoading}
                labelEditAction={labelEditAction}
                labelQuoteAction={labelQuoteAction}
                labelTitle={labelTitle ?? <></>}
                linkId={linkId}
                fullName={fullName}
                username={username}
                updatedAt={updatedAt}
                onEdit={onEdit}
                onQuote={onQuote}
                outlineComment={outlineComment}
              />
              {markdown}
            </MyEuiPanel>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    {showTopFooter && (
      <PushedContainer>
        <PushedInfoContainer>
          <EuiText size="xs" color="subdued">
            {i18n.ALREADY_PUSHED_TO_SERVICE}
          </EuiText>
        </PushedInfoContainer>
        <EuiHorizontalRule />
        {showBottomFooter && (
          <PushedInfoContainer>
            <EuiText size="xs" color="subdued">
              {i18n.REQUIRED_UPDATE_TO_SERVICE}
            </EuiText>
          </PushedInfoContainer>
        )}
      </PushedContainer>
    )}
  </UserActionItemContainer>
);
