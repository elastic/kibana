/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import * as i18n from '../case_view/translations';

import { Case, CaseUserActions, Comment } from '../../../../containers/case/types';
import { useUpdateComment } from '../../../../containers/case/use_update_comment';
import { useCurrentUser } from '../../../../lib/kibana';
import { AddComment } from '../add_comment';
import { getLabelTitle } from './helpers';
import { UserActionItem, UserActionItemContainer } from './user_action_item';
import { UserActionMarkdown } from './user_action_markdown';

export interface UserActionTreeProps {
  data: Case;
  caseUserActions: CaseUserActions[];
  isLoadingDescription: boolean;
  isLoadingUserActions: boolean;
  fetchUserActions: () => void;
  onUpdateField: (updateKey: keyof Case, updateValue: string | string[]) => void;
}

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 8px;
`;

const DescriptionId = 'description';
const NewId = 'newComment';

export const UserActionTree = React.memo(
  ({
    data: caseData,
    caseUserActions,
    fetchUserActions,
    isLoadingDescription,
    isLoadingUserActions,
    onUpdateField,
  }: UserActionTreeProps) => {
    const handlerTimeoutId = useRef(0);
    const [selectedOutlineCommentId, setSelectedOutlineCommentId] = useState('');
    const { comments, isLoadingIds, updateComment, addPostedComment } = useUpdateComment(
      caseData.comments
    );
    const currentUser = useCurrentUser();
    const [manageMarkdownEditIds, setManangeMardownEditIds] = useState<string[]>([]);

    const handleManageMarkdownEditId = useCallback(
      (id: string) => {
        if (!manageMarkdownEditIds.includes(id)) {
          setManangeMardownEditIds([...manageMarkdownEditIds, id]);
        } else {
          setManangeMardownEditIds(manageMarkdownEditIds.filter(myId => id !== myId));
        }
      },
      [manageMarkdownEditIds]
    );

    const handleSaveComment = useCallback(
      (id: string, content: string) => {
        handleManageMarkdownEditId(id);
        updateComment({
          caseId: caseData.id,
          commentId: id,
          commentUpdate: content,
          fetchUserActions,
        });
      },
      [handleManageMarkdownEditId, updateComment]
    );

    const handleOutlineComment = useCallback(
      (id: string) => {
        window.clearTimeout(handlerTimeoutId.current);
        setSelectedOutlineCommentId(id);
        handlerTimeoutId.current = window.setTimeout(() => {
          setSelectedOutlineCommentId('');
          window.clearTimeout(handlerTimeoutId.current);
        }, 2400);
      },
      [handlerTimeoutId.current]
    );

    const handleUpdate = useCallback(
      (comment: Comment) => {
        addPostedComment(comment);
        fetchUserActions();
      },
      [addPostedComment, fetchUserActions]
    );

    const MarkdownDescription = useMemo(
      () => (
        <UserActionMarkdown
          id={DescriptionId}
          content={caseData.description}
          isEditable={manageMarkdownEditIds.includes(DescriptionId)}
          onSaveContent={(content: string) => {
            handleManageMarkdownEditId(DescriptionId);
            onUpdateField(DescriptionId, content);
          }}
          onChangeEditable={handleManageMarkdownEditId}
        />
      ),
      [caseData.description, handleManageMarkdownEditId, manageMarkdownEditIds, onUpdateField]
    );

    const MarkdownNewComment = useMemo(
      () => (
        <AddComment
          caseId={caseData.id}
          onCommentPosted={handleUpdate}
          onCommentSaving={handleManageMarkdownEditId.bind(null, NewId)}
          showLoading={false}
        />
      ),
      [caseData.id, handleUpdate]
    );

    return (
      <>
        <UserActionItem
          createdAt={caseData.createdAt}
          id={DescriptionId}
          isEditable={manageMarkdownEditIds.includes(DescriptionId)}
          isLoading={isLoadingDescription}
          labelEditAction={i18n.EDIT_DESCRIPTION}
          labelTitle={i18n.ADDED_DESCRIPTION}
          fullName={caseData.createdBy.fullName ?? caseData.createdBy.username}
          markdown={MarkdownDescription}
          onEdit={handleManageMarkdownEditId.bind(null, DescriptionId)}
          userName={caseData.createdBy.username}
        />
        {caseUserActions.map(action => {
          if (action.commentId != null && action.action === 'create') {
            const comment = comments.find(c => c.id === action.commentId);
            if (comment != null) {
              return (
                <UserActionItem
                  key={action.actionId}
                  createdAt={comment.createdAt}
                  id={comment.id}
                  idToOutline={selectedOutlineCommentId}
                  isEditable={manageMarkdownEditIds.includes(comment.id)}
                  isLoading={isLoadingIds.includes(comment.id)}
                  labelEditAction={i18n.EDIT_COMMENT}
                  labelTitle={<>{i18n.ADDED_COMMENT}</>}
                  fullName={comment.createdBy.fullName ?? comment.createdBy.username}
                  markdown={
                    <UserActionMarkdown
                      id={comment.id}
                      content={comment.comment}
                      isEditable={manageMarkdownEditIds.includes(comment.id)}
                      onChangeEditable={handleManageMarkdownEditId}
                      onSaveContent={handleSaveComment.bind(null, comment.id)}
                    />
                  }
                  onEdit={handleManageMarkdownEditId.bind(null, comment.id)}
                  outlineComment={handleOutlineComment}
                  userName={comment.createdBy.username}
                  updatedAt={comment.updatedAt}
                />
              );
            }
          }
          if (action.actionField.length === 1) {
            const myField = action.actionField[0];
            const labelTitle: string | JSX.Element = getLabelTitle(myField, action);

            return (
              <UserActionItem
                key={action.actionId}
                createdAt={action.actionAt}
                id={action.actionId}
                isEditable={false}
                isLoading={false}
                labelTitle={<>{labelTitle}</>}
                linkId={
                  action.action === 'update' && action.commentId != null ? action.commentId : null
                }
                fullName={action.actionBy.fullName ?? action.actionBy.username}
                outlineComment={handleOutlineComment}
                userName={action.actionBy.username}
              />
            );
          }
          return null;
        })}
        {(isLoadingUserActions || isLoadingIds.includes(NewId)) && (
          <MyEuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </MyEuiFlexGroup>
        )}
        <UserActionItem
          createdAt={new Date().toISOString()}
          id={NewId}
          isEditable={true}
          isLoading={isLoadingIds.includes(NewId)}
          fullName={currentUser != null ? currentUser.fullName : ''}
          markdown={MarkdownNewComment}
          userName={currentUser != null ? currentUser.username : ''}
        />
      </>
    );
  }
);

UserActionTree.displayName = 'UserActionTree';
