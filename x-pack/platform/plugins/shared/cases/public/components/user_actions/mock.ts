/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiButtonIcon } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { UserActionActions } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { EVENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import type { UnifiedReferenceAttachmentType } from '../../client/attachment_framework/types';
import { AttachmentActionType } from '../../client/attachment_framework/types';
import { getCommentAttachmentType } from '../attachments/comment';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { basicCase, getUserAction } from '../../containers/mock';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import type { UserActionBuilderArgs } from './types';
import type { CommentRenderingContextValue } from './comment/comment_rendering_context';
import { casesConfigurationsMock } from '../../containers/configure/mock';

export const getMockBuilderArgs = (): UserActionBuilderArgs => {
  const userAction = getUserAction('title', UserActionActions.update);

  const alertData = {
    'alert-id-1': {
      _id: 'alert-id-1',
      _index: 'alert-index-1',
      signal: {
        rule: {
          id: ['rule-id-1'],
          name: ['Awesome rule'],
          false_positives: [],
        },
      },
      kibana: {
        alert: {
          rule: {
            uuid: ['rule-id-1'],
            name: ['Awesome rule'],
            false_positives: [],
            parameters: {},
          },
        },
      },
      owner: SECURITY_SOLUTION_OWNER,
    },
  };

  const caseConnectors = getCaseConnectorsMockResponse();

  const getRuleDetailsHref = jest.fn().mockReturnValue('https://example.com');
  const onRuleDetailsClick = jest.fn();
  const onShowAlertDetails = jest.fn();
  const handleDeleteComment = jest.fn();
  const handleOutlineComment = jest.fn();
  const handleManageMarkdownEditId = jest.fn();
  const handleManageQuote = jest.fn();
  const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
  unifiedAttachmentTypeRegistry.register(getCommentAttachmentType());
  unifiedAttachmentTypeRegistry.register(getMockEventType());

  return {
    appId: 'cases',
    userAction,
    userProfiles: userProfilesMap,
    currentUserProfile: userProfiles[0],
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    unifiedAttachmentTypeRegistry,
    caseData: basicCase,
    casesConfiguration: casesConfigurationsMock,
    attachments: basicCase.comments,
    index: 0,
    alertData,
    manageMarkdownEditIds: [],
    selectedOutlineCommentId: '',
    loadingCommentIds: [],
    loadingAlertData: false,
    caseConnectors,
    getRuleDetailsHref,
    onRuleDetailsClick,
    onShowAlertDetails,
    handleDeleteComment,
    handleOutlineComment,
    handleManageMarkdownEditId,
    handleManageQuote,
    euiTheme: {
      border: { thin: '1px solid #d3dae6' },
      size: { s: '8px', base: '16px', xl: '24px' },
    } as EuiThemeComputed<{}>,
  };
};

/**
 * Returns a full CommentRenderingContextValue for tests. Override with partial as needed.
 */
export const getMockCommentRenderingContext = (
  overrides: Partial<CommentRenderingContextValue> = {}
): CommentRenderingContextValue => ({
  appId: '',
  caseData: basicCase,
  userProfiles: userProfilesMap,
  commentRefs: { current: {} },
  manageMarkdownEditIds: [],
  selectedOutlineCommentId: '',
  loadingCommentIds: [],
  euiTheme: {
    border: { thin: '1px solid #d3dae6' },
    size: { s: '8px', base: '16px', xl: '24px' },
  } as CommentRenderingContextValue['euiTheme'],
  handleManageMarkdownEditId: jest.fn(),
  handleSaveComment: jest.fn(),
  handleManageQuote: jest.fn(),
  handleDeleteComment: jest.fn(),
  ...overrides,
});

const MockShowEventButton: React.FC<{
  id: string;
  eventId: string;
  index: string;
}> = ({ id, eventId, index }) => {
  const { openFlyout } = require('@kbn/expandable-flyout').useExpandableFlyoutApi();
  return (
    <EuiButtonIcon
      aria-label="Show event details"
      data-test-subj={`comment-action-show-event-${id}`}
      iconType="arrowRight"
      onClick={() => {
        openFlyout({
          right: {
            id: 'document-details-right',
            params: {
              id: eventId,
              indexName: index,
              scopeId: 'timeline-case',
            },
          },
        });
      }}
    />
  );
};

/**
 * Minimal mock event type for unit tests. Renders the expected structure for event tests.
 */
export const getMockEventType = (): UnifiedReferenceAttachmentType => ({
  id: EVENT_ATTACHMENT_TYPE,
  displayName: 'Event',
  icon: 'bell',
  getAttachmentViewObject: (props) => {
    const eventId = props.attachmentId;
    const index = (props.metadata?.index ?? '') as string;
    return {
      event: (
        <span data-test-subj={`single-event-user-action-${eventId}`}>added an event</span>
      ),
      timelineAvatar: (
        <EuiAvatar name="event" color="subdued" iconType="bell" aria-label="event" />
      ),
      getActions: () =>
        eventId && index
          ? [
              {
                type: AttachmentActionType.CUSTOM as const,
                isPrimary: true,
                render: () => (
                  <MockShowEventButton
                    id={props.savedObjectId}
                    eventId={eventId}
                    index={index}
                  />
                ),
              },
            ]
          : [],
    };
  },
  getAttachmentRemovalObject: () => ({ event: 'removed event' }),
});
