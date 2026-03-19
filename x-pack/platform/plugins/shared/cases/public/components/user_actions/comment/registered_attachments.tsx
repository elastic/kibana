/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import classNames from 'classnames';
import { memoize, partition } from 'lodash';

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiCallOut, EuiCode, EuiLoadingSpinner, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';

import type {
  AttachmentType,
  AttachmentViewObject,
  CommonAttachmentViewProps,
} from '../../../client/attachment_framework/types';

import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { UserActionTimestamp } from '../timestamp';
import type { AttachmentTypeRegistry } from '../../../../common/registry';
import type { AttachmentV2 } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import {
  ATTACHMENT_NOT_REGISTERED_ERROR,
  ADD_COMMENT,
  DEFAULT_EVENT_ATTACHMENT_TITLE,
  DELETE_REGISTERED_ATTACHMENT,
} from './translations';
import * as caseViewI18n from '../../case_view/translations';
import { UserActionContentToolbar } from '../content_toolbar';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { RegisteredAttachmentsPropertyActions } from '../property_actions/registered_attachments_property_actions';
import { CommentChildren } from '../../attachments/comment/comment_children';
import { createCommentActionCss, hasDraftComment } from '../../attachments/comment/utils';

const getCommentContent = (data?: Record<string, unknown> | null): string =>
  (data?.comment ?? data?.content ?? '') as string;

type BuilderArgs<C, R> = Pick<
  UserActionBuilderArgs,
  'userAction' | 'caseData' | 'handleDeleteComment' | 'userProfiles'
> & {
  attachment: SnakeToCamelCase<C>;
  registry: R;
  isLoading: boolean;
  getId: () => string;
  getAttachmentViewProps: () => object;
  manageMarkdownEditIds?: string[];
  selectedOutlineCommentId?: string;
  loadingCommentIds?: string[];
  appId?: string;
  euiTheme?: EuiThemeComputed<{}>;
  handleManageMarkdownEditId?: (id: string) => void;
  handleManageQuote?: (quote: string) => void;
};

/**
 * Renders attachment type children (e.g. custom content for lens, etc.)
 */
const getAttachmentChildrenRenderer = memoize((cachingKey: string) => {
  let AttachmentElement: React.ReactElement;

  const renderCallback = (
    attachmentViewObject: AttachmentViewObject<CommonAttachmentViewProps>,
    props: CommonAttachmentViewProps
  ) => {
    if (!attachmentViewObject.children) return null;

    if (!AttachmentElement) {
      AttachmentElement = React.createElement(attachmentViewObject.children, props);
    } else {
      AttachmentElement = React.cloneElement(AttachmentElement, props);
    }

    return <Suspense fallback={<EuiLoadingSpinner />}>{AttachmentElement}</Suspense>;
  };

  return renderCallback;
});

export const createRegisteredAttachmentUserActionBuilder = <
  C extends AttachmentV2,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R extends AttachmentTypeRegistry<AttachmentType<any>>
>({
  userAction,
  userProfiles,
  attachment,
  registry,
  caseData,
  isLoading,
  getId,
  getAttachmentViewProps,
  handleDeleteComment,
  handleManageMarkdownEditId,
  handleManageQuote,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  appId,
  euiTheme,
}: BuilderArgs<C, R>): ReturnType<UserActionBuilder> => ({
  build: () => {
    const attachmentTypeId: string = getId();
    const isTypeRegistered = registry.has(attachmentTypeId);

    if (!isTypeRegistered) {
      return [
        {
          username: (
            <HoverableUserWithAvatarResolver
              user={attachment.createdBy}
              userProfiles={userProfiles}
            />
          ),
          event: (
            <>
              {`${DEFAULT_EVENT_ATTACHMENT_TITLE} `}
              <EuiCode>{attachmentTypeId}</EuiCode>
            </>
          ),
          className: `comment-${attachment.type}-not-found`,
          'data-test-subj': `comment-${attachment.type}-not-found`,
          timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
          children: (
            <EuiCallOut
              announceOnMount={false}
              title={ATTACHMENT_NOT_REGISTERED_ERROR}
              color="danger"
              iconType="warning"
            />
          ),
        },
      ];
    }

    let attachmentType;
    try {
      attachmentType = registry.get(attachmentTypeId);
    } catch {
      return [
        {
          username: (
            <HoverableUserWithAvatarResolver
              user={attachment.createdBy}
              userProfiles={userProfiles}
            />
          ),
          event: (
            <>
              {`${DEFAULT_EVENT_ATTACHMENT_TITLE} `}
              <EuiCode>{attachmentTypeId}</EuiCode>
            </>
          ),
          className: `comment-${attachment.type}-not-found`,
          'data-test-subj': `comment-${attachment.type}-not-found`,
          timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
          children: (
            <EuiCallOut
              announceOnMount={false}
              title={ATTACHMENT_NOT_REGISTERED_ERROR}
              color="danger"
              iconType="warning"
            />
          ),
        },
      ];
    }

    const viewProps = getAttachmentViewProps() as {
      data?: Record<string, unknown> | null;
      version?: string;
      [key: string]: unknown;
    };
    const savedObjectId = attachment.id;
    const props = {
      ...viewProps,
      savedObjectId,
      caseData: { id: caseData.id, title: caseData.title },
      // For unified reference attachments (events, alerts), attachmentId = external ref (event/alert id).
      // For value attachments (comments), attachmentId = saved object id (legacy; use savedObjectId).
      attachmentId:
        'attachmentId' in viewProps && typeof viewProps.attachmentId === 'string'
          ? viewProps.attachmentId
          : savedObjectId,
    };

    const attachmentViewObject = attachmentType.getAttachmentViewObject(props);

    const commentContent = getCommentContent(viewProps.data);
    const hasComment = viewProps.data?.content != null || viewProps.data?.comment != null;
    const isAddMode = manageMarkdownEditIds?.includes(savedObjectId) ?? false;
    const showCommentBlock = hasComment || isAddMode;

    const isReferenceAttachment = 'attachmentId' in props && props.attachmentId !== savedObjectId;
    const attachmentPayload =
      showCommentBlock && isReferenceAttachment
        ? {
            type: attachment.type,
            attachmentId: props.attachmentId,
            owner: (attachment as { owner?: string }).owner ?? caseData.owner,
            ...(viewProps.metadata != null && { metadata: viewProps.metadata }),
          }
        : undefined;

    const attachmentChildrenRenderer = getAttachmentChildrenRenderer(userAction.id);
    const attachmentChildren = attachmentViewObject.children
      ? attachmentChildrenRenderer(attachmentViewObject, props)
      : null;

    const commentBlock = showCommentBlock ? (
      <CommentChildren
        commentId={savedObjectId}
        content={commentContent ?? ''}
        caseId={caseData.id}
        version={(viewProps.version as string) ?? ''}
        attachmentPayload={attachmentPayload}
      />
    ) : null;

    const children = (
      <>
        {commentBlock}
        {attachmentChildren}
      </>
    );

    const isEdit = manageMarkdownEditIds?.includes(savedObjectId) ?? false;
    const isLoadingComment = loadingCommentIds?.includes(savedObjectId) ?? false;
    const draftFooter =
      !isEdit &&
      !isLoadingComment &&
      hasDraftComment(appId ?? '', caseData.id, savedObjectId, commentContent ?? '');

    const commentClassName = classNames('userAction__comment', {
      outlined: savedObjectId === selectedOutlineCommentId,
      isEdit,
      draftFooter,
      'userAction__comment--hideHeaderOnEdit': showCommentBlock && !isReferenceAttachment,
      'userAction__comment--emptyComment':
        (showCommentBlock && !commentContent) || (!showCommentBlock && isReferenceAttachment),
    });

    const baseClassName =
      attachmentViewObject.className ?? `comment-${attachment.type}-attachment-${attachmentTypeId}`;
    const className =
      showCommentBlock || isReferenceAttachment
        ? classNames(baseClassName, commentClassName)
        : baseClassName;
    const css = showCommentBlock
      ? attachmentViewObject.css ?? createCommentActionCss(euiTheme)
      : attachmentViewObject.css;

    const commentActions: Array<{
      type: typeof AttachmentActionType.BUTTON;
      iconType: string;
      label: string;
      onClick: () => void;
    }> = [];
    if (showCommentBlock && handleManageMarkdownEditId) {
      commentActions.push({
        type: AttachmentActionType.BUTTON,
        iconType: 'pencil',
        label: caseViewI18n.EDIT_COMMENT,
        onClick: () => handleManageMarkdownEditId(savedObjectId),
      });
    }
    if (showCommentBlock && handleManageQuote) {
      commentActions.push({
        type: AttachmentActionType.BUTTON,
        iconType: 'quote',
        label: caseViewI18n.QUOTE,
        onClick: () => handleManageQuote(commentContent ?? ''),
      });
    }
    if (!hasComment && isReferenceAttachment && handleManageMarkdownEditId) {
      commentActions.push({
        type: AttachmentActionType.BUTTON,
        iconType: 'editorComment',
        label: ADD_COMMENT,
        onClick: () => handleManageMarkdownEditId(savedObjectId),
      });
    }

    const actions = attachmentViewObject.getActions?.(props) ?? [];
    const [primaryActions, nonPrimaryActions] = partition(actions, 'isPrimary');
    const visiblePrimaryActions = primaryActions.slice(0, 2);
    const nonVisiblePrimaryActions = [
      ...commentActions,
      ...primaryActions.slice(2),
      ...nonPrimaryActions,
    ];

    return [
      {
        username: (
          <HoverableUserWithAvatarResolver
            user={attachment.createdBy}
            userProfiles={userProfiles}
          />
        ),
        className,
        css,
        event: attachmentViewObject.event,
        'data-test-subj': `comment-${attachment.type}-${attachmentTypeId}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineAvatar: attachmentViewObject.timelineAvatar,
        actions: (
          <UserActionContentToolbar id={attachment.id}>
            {visiblePrimaryActions.map(
              (action) =>
                (action.type === AttachmentActionType.BUTTON && (
                  <EuiFlexItem
                    grow={false}
                    data-test-subj={`attachment-${attachmentTypeId}-${attachment.id}`}
                    key={`attachment-${attachmentTypeId}-${attachment.id}`}
                  >
                    <EuiButtonIcon
                      aria-label={action.label}
                      iconType={action.iconType}
                      color={action.color ?? 'text'}
                      onClick={action.onClick}
                      data-test-subj={`attachment-${attachmentTypeId}-${attachment.id}-${action.iconType}`}
                      key={`attachment-${attachmentTypeId}-${attachment.id}-${action.iconType}`}
                    />
                  </EuiFlexItem>
                )) ||
                (action.type === AttachmentActionType.CUSTOM && action.render())
            )}
            <RegisteredAttachmentsPropertyActions
              isLoading={isLoading}
              onDelete={() => handleDeleteComment(attachment.id, DELETE_REGISTERED_ATTACHMENT)}
              registeredAttachmentActions={nonVisiblePrimaryActions}
              hideDefaultActions={!!attachmentViewObject.hideDefaultActions}
            />
          </UserActionContentToolbar>
        ),
        children,
      },
    ];
  },
});
