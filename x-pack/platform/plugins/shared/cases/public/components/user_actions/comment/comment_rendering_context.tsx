/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, memo } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../containers/types';

/**
 * Context value for comment attachment rendering concerns.
 * All fields are required when providing the context; consumers receive
 * Partial when outside the provider (e.g. tests) via useCommentRenderingContext.
 */
export interface CommentRenderingContextValue {
  appId: string;
  caseData: CaseUI;
  userProfiles: Map<string, UserProfileWithAvatar>;
  commentRefs: React.MutableRefObject<Record<string, unknown>>;
  manageMarkdownEditIds: string[];
  selectedOutlineCommentId: string;
  loadingCommentIds: string[];
  euiTheme: EuiThemeComputed<{}>;
  handleManageMarkdownEditId: (id: string) => void;
  handleSaveComment: (props: { id: string; version: string }, content: string) => void;
  handleManageQuote: (quote: string) => void;
  handleDeleteComment: (id: string, title: string) => void;
}

const CommentRenderingContext = createContext<CommentRenderingContextValue | undefined>(undefined);

/**
 * Hook to access comment rendering context.
 * Returns partial when used outside CommentRenderingProvider (e.g. in tests).
 */
export const useCommentRenderingContext = (): Partial<CommentRenderingContextValue> => {
  const context = useContext(CommentRenderingContext);
  return context ?? {};
};

export const CommentRenderingProvider: React.FC<{
  value: CommentRenderingContextValue;
  children: React.ReactNode;
}> = memo(({ value, children }) => {
  return (
    <CommentRenderingContext.Provider value={value}>{children}</CommentRenderingContext.Provider>
  );
});
CommentRenderingProvider.displayName = 'CommentRenderingProvider';
