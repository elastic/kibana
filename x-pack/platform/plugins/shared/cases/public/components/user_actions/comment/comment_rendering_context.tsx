/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { User } from '../../../../common/types/domain';
import type { CaseUI } from '../../../containers/types';

/**
 * Context value for comment attachment rendering concerns.
 * This separates UI-specific rendering logic from attachment data,
 * making the attachment data structure clean and scalable for other types.
 */
export interface CommentRenderingContextValue {
  appId?: string;
  caseData?: CaseUI;
  userProfiles?: Map<string, UserProfileWithAvatar>;
  commentRefs?: React.MutableRefObject<Record<string, unknown>>;
  manageMarkdownEditIds?: string[];
  selectedOutlineCommentId?: string;
  loadingCommentIds?: string[];
  euiTheme?: EuiThemeComputed<{}>;
  handleManageMarkdownEditId?: (id: string) => void;
  handleSaveComment?: (props: { id: string; version: string }, content: string) => void;
  handleManageQuote?: (quote: string) => void;
  handleDeleteComment?: (id: string, title: string) => void;
  createdBy?: User;
  createdAt?: string;
  updatedBy?: User;
  updatedAt?: string;
  pushedAt?: string;
  pushedBy?: User;
  owner?: string;
}

const CommentRenderingContext = createContext<CommentRenderingContextValue | undefined>(undefined);

/**
 * Hook to access comment rendering context.
 * This provides UI-specific rendering concerns for comment attachments.
 */
export const useCommentRenderingContext = (): CommentRenderingContextValue => {
  const context = useContext(CommentRenderingContext);
  return context || {};
};

/**
 * Provider component for comment rendering context.
 * Wraps the user actions list to provide rendering concerns to comment attachments.
 */
export const CommentRenderingProvider: React.FC<{
  value: CommentRenderingContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <CommentRenderingContext.Provider value={value}>{children}</CommentRenderingContext.Provider>
  );
};
CommentRenderingProvider.displayName = 'CommentRenderingProvider';
