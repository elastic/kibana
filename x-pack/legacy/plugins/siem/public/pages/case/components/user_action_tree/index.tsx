/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import * as i18n from '../case_view/translations';
import {
  FormattedRelativePreferenceDate,
  FormattedRelativePreferenceLabel,
} from '../../../../components/formatted_date';
import { PropertyActions } from '../property_actions';
import { Markdown } from '../../../../components/markdown';
import { MarkdownEditor } from '../../../../components/markdown_editor';
import { AddComment } from '../add_comment';
import { Case } from '../../../../containers/case/types';
import { useUpdateComment } from '../../../../containers/case/use_update_comment';

export interface UserActionItem {
  avatarName: string;
  children?: ReactNode;
  skipPanel?: boolean;
  title?: ReactNode;
}

export interface UserActionTreeProps {
  data: Case;
  isLoadingDescription: boolean;
  onUpdateField: (updateKey: keyof Case, updateValue: string | string[]) => void;
}

const UserAction = styled(EuiFlexGroup)`
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
const MySpinner = styled(EuiLoadingSpinner)`
  .euiLoadingSpinner {
    margin-top: 1px; // yes it matters!
  }
`;

const ContentWrapper = styled.div`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeM} ${theme.eui.euiSizeL};
  `}
`;

export const UserActionTree = React.memo(
  ({ data, onUpdateField, isLoadingDescription }: UserActionTreeProps) => {
    const [
      { data: comments, isLoading: isLoadingComment, isLoadingCommentId },
      dispatchUpdateComment,
    ] = useUpdateComment(data.comments);
    const [commentUpdate, setCommentUpdate] = useState('');
    const [description, setDescription] = useState(data.description);
    const [editCommentId, setEditCommentId] = useState('');
    const [isEditDescription, setIsEditDescription] = useState(false);
    const renderButtons = useCallback(({ cancelAction, saveAction }) => {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={cancelAction} iconType="cross">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="secondary" fill iconType="save" onClick={saveAction} size="s">
              {i18n.SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, []);
    const renderUserActions = useMemo(() => {
      const userActions: UserActionItem[] = comments.reduce(
        (acc, comment, key) => {
          return [
            ...acc,
            {
              avatarName: comment.createdBy.fullName
                ? comment.createdBy.fullName
                : comment.createdBy.username,
              title: (
                <EuiFlexGroup
                  alignItems="baseline"
                  gutterSize="none"
                  justifyContent="spaceBetween"
                  key={`${comment.commentId}.${key}`}
                >
                  <EuiFlexItem grow={false}>
                    <p>
                      <strong>{`${comment.createdBy.username}`}</strong>
                      {` ${i18n.ADDED_COMMENT} `}{' '}
                      <FormattedRelativePreferenceLabel
                        value={comment.createdAt}
                        preferenceLabel={`${i18n.ON} `}
                      />
                      <FormattedRelativePreferenceDate value={comment.createdAt} />
                    </p>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isLoadingCommentId === comment.commentId && <MySpinner />}
                    {(!isLoadingComment || isLoadingCommentId !== comment.commentId) && (
                      <PropertyActions
                        propertyActions={[
                          {
                            iconType: 'documentEdit',
                            label: i18n.EDIT_COMMENT,
                            onClick: () => setEditCommentId(comment.commentId),
                          },
                        ]}
                      />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
              children:
                comment.commentId === editCommentId ? (
                  <MarkdownEditor
                    footerContentRight={renderButtons({
                      cancelAction: () => setEditCommentId(''),
                      saveAction: () => {
                        // TO DO
                        if (commentUpdate !== comment.comment) {
                          dispatchUpdateComment(comment.commentId, commentUpdate);
                        }
                        setEditCommentId('');
                      },
                    })}
                    initialContent={comment.comment}
                    onChange={updatedComment => {
                      setCommentUpdate(updatedComment);
                    }}
                  />
                ) : (
                  <ContentWrapper key={`${comment.commentId}.${key}`}>
                    <Markdown raw={comment.comment} data-test-subj="case-view-comment" />
                  </ContentWrapper>
                ),
              skipPanel: comment.commentId === editCommentId,
            },
          ];
        },
        [
          {
            avatarName: data.createdBy.fullName ? data.createdBy.fullName : data.createdBy.username,
            title: (
              <EuiFlexGroup alignItems="baseline" gutterSize="none" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <p>
                    <strong>{`${data.createdBy.username}`}</strong>
                    {` ${i18n.ADDED_DESCRIPTION} `}{' '}
                    <FormattedRelativePreferenceLabel
                      value={data.createdAt}
                      preferenceLabel={`${i18n.ON} `}
                    />
                    <FormattedRelativePreferenceDate value={data.createdAt} />
                  </p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {isLoadingDescription && <EuiLoadingSpinner />}
                  {!isLoadingDescription && (
                    <PropertyActions
                      propertyActions={[
                        {
                          iconType: 'documentEdit',
                          label: i18n.EDIT_DESCRIPTION,
                          onClick: () => setIsEditDescription(true),
                        },
                      ]}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            children: isEditDescription ? (
              <MarkdownEditor
                footerContentRight={renderButtons({
                  cancelAction: () => setIsEditDescription(false),
                  saveAction: () => {
                    if (description !== data.description) {
                      onUpdateField('description', description);
                    }
                    setIsEditDescription(false);
                  },
                })}
                initialContent={data.description}
                onChange={updatedDescription => setDescription(updatedDescription)}
              />
            ) : (
              <ContentWrapper>
                <Markdown raw={data.description} data-test-subj="case-view-description" />
              </ContentWrapper>
            ),
            skipPanel: isEditDescription,
          },
        ]
      );
      return [
        ...userActions,
        {
          avatarName: 'getcurrentuser todo',
          children: <AddComment caseId={data.caseId} />,
          skipPanel: true,
        },
      ];
    }, [data.version, isEditDescription, editCommentId, description, commentUpdate, comments]);

    return (
      <>
        {renderUserActions.map(({ avatarName, children, skipPanel = false, title }, key) => (
          <UserAction data-test-subj={`user-action-${key}`} key={key} gutterSize={'none'}>
            <EuiFlexItem grow={false}>
              <EuiAvatar
                data-test-subj={`user-action-avatar`}
                className="userAction__circle"
                name={avatarName}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {skipPanel ? (
                <>{children && <div data-test-subj={`user-action-content`}>{children}</div>}</>
              ) : (
                <EuiPanel className="userAction__panel" paddingSize="none">
                  {title && (
                    <EuiText
                      size="s"
                      className="userAction__title"
                      data-test-subj={`user-action-title`}
                    >
                      {title}
                    </EuiText>
                  )}
                  {children && <div data-test-subj={`user-action-content`}>{children}</div>}
                </EuiPanel>
              )}
            </EuiFlexItem>
          </UserAction>
        ))}
      </>
    );
  }
);

UserActionTree.displayName = 'UserActionTree';
