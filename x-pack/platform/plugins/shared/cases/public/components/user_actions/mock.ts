/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionActions } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { basicCase, getUserAction } from '../../containers/mock';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import type { UserActionBuilderArgs } from './types';
import { casesConfigurationsMock } from '../../containers/configure/mock';

export const getMockBuilderArgs = (): UserActionBuilderArgs => {
  const userAction = getUserAction('title', UserActionActions.update);
  const commentRefs = { current: {} };

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
  const handleManageMarkdownEditId = jest.fn();
  const handleSaveComment = jest.fn();
  const handleDeleteComment = jest.fn();
  const handleManageQuote = jest.fn();
  const handleOutlineComment = jest.fn();
  const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

  return {
    userAction,
    userProfiles: userProfilesMap,
    currentUserProfile: userProfiles[0],
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    caseData: basicCase,
    casesConfiguration: casesConfigurationsMock,
    comments: basicCase.comments,
    index: 0,
    alertData,
    commentRefs,
    manageMarkdownEditIds: [],
    selectedOutlineCommentId: '',
    loadingCommentIds: [],
    loadingAlertData: false,
    caseConnectors,
    getRuleDetailsHref,
    onRuleDetailsClick,
    onShowAlertDetails,
    handleManageMarkdownEditId,
    handleSaveComment,
    handleDeleteComment,
    handleManageQuote,
    handleOutlineComment,
  };
};
