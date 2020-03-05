/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import * as i18n from '../case_view/translations';

import { Case } from '../../../../containers/case/types';
import { useUpdateComment } from '../../../../containers/case/use_update_comment';
import { UserActionItem } from './user_action_item';
import { UserActionMarkdown } from './user_action_markdown';
import { AddComment } from '../add_comment';

export interface UserActionTreeProps {
  data: Case;
  isLoadingDescription: boolean;
  onUpdateField: (updateKey: keyof Case, updateValue: string | string[]) => void;
}

const DescriptionId = 'description';
const NewId = 'newComent';

export const UserActionTree = React.memo(
  ({ data, onUpdateField, isLoadingDescription }: UserActionTreeProps) => {
    const [{ data: comments, isLoadingIds }, dispatchUpdateComment] = useUpdateComment(
      data.comments
    );

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
        dispatchUpdateComment(id, content);
      },
      [handleManageMarkdownEditId, dispatchUpdateComment]
    );

    const MarkdownDescription = useMemo(
      () => (
        <UserActionMarkdown
          id={DescriptionId}
          content={data.description}
          isEditable={manageMarkdownEditIds.includes(DescriptionId)}
          onSaveContent={(content: string) => {
            handleManageMarkdownEditId(DescriptionId);
            onUpdateField(DescriptionId, content);
          }}
          onChangeEditable={handleManageMarkdownEditId}
        />
      ),
      [data.description, handleManageMarkdownEditId, manageMarkdownEditIds, onUpdateField]
    );

    const MarkdownNewComment = useMemo(() => <AddComment caseId={data.caseId} />, [data.caseId]);

    return (
      <>
        <UserActionItem
          createdAt={data.createdAt}
          id={DescriptionId}
          isEditable={manageMarkdownEditIds.includes(DescriptionId)}
          isLoading={isLoadingDescription}
          labelAction={i18n.EDIT_DESCRIPTION}
          labelTitle={i18n.ADDED_DESCRIPTION}
          fullName={data.createdBy.fullName ?? data.createdBy.username}
          markdown={MarkdownDescription}
          onEdit={handleManageMarkdownEditId.bind(null, DescriptionId)}
          userName={data.createdBy.username}
        />
        {comments.map(comment => (
          <UserActionItem
            key={comment.commentId}
            createdAt={comment.createdAt}
            id={comment.commentId}
            isEditable={manageMarkdownEditIds.includes(comment.commentId)}
            isLoading={isLoadingIds.includes(comment.commentId)}
            labelAction={i18n.EDIT_COMMENT}
            labelTitle={i18n.ADDED_COMMENT}
            fullName={comment.createdBy.fullName ?? comment.createdBy.username}
            markdown={
              <UserActionMarkdown
                id={comment.commentId}
                content={comment.comment}
                isEditable={manageMarkdownEditIds.includes(comment.commentId)}
                onChangeEditable={handleManageMarkdownEditId}
                onSaveContent={handleSaveComment.bind(null, comment.commentId)}
              />
            }
            onEdit={handleManageMarkdownEditId.bind(null, comment.commentId)}
            userName={comment.createdBy.username}
          />
        ))}
        <UserActionItem
          createdAt={new Date().toISOString()}
          id={NewId}
          isEditable={true}
          isLoading={isLoadingIds.includes(NewId)}
          fullName="to be determined"
          markdown={MarkdownNewComment}
          onEdit={handleManageMarkdownEditId.bind(null, NewId)}
          userName="to be determined"
        />
      </>
    );
  }
);

UserActionTree.displayName = 'UserActionTree';
