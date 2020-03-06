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
  ({ data: caseData, onUpdateField, isLoadingDescription }: UserActionTreeProps) => {
    const { comments, isLoadingIds, updateComment } = useUpdateComment(caseData.comments);

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
        updateComment(id, content);
      },
      [handleManageMarkdownEditId, updateComment]
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

    const MarkdownNewComment = useMemo(() => <AddComment caseId={caseData.id} />, [caseData.id]);

    return (
      <>
        <UserActionItem
          createdAt={caseData.createdAt}
          id={DescriptionId}
          isEditable={manageMarkdownEditIds.includes(DescriptionId)}
          isLoading={isLoadingDescription}
          labelAction={i18n.EDIT_DESCRIPTION}
          labelTitle={i18n.ADDED_DESCRIPTION}
          fullName={caseData.createdBy.fullName ?? caseData.createdBy.username}
          markdown={MarkdownDescription}
          onEdit={handleManageMarkdownEditId.bind(null, DescriptionId)}
          userName={caseData.createdBy.username}
        />
        {comments.map(comment => (
          <UserActionItem
            key={comment.id}
            createdAt={comment.createdAt}
            id={comment.id}
            isEditable={manageMarkdownEditIds.includes(comment.id)}
            isLoading={isLoadingIds.includes(comment.id)}
            labelAction={i18n.EDIT_COMMENT}
            labelTitle={i18n.ADDED_COMMENT}
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
