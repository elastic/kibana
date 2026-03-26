/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, render, screen } from '@testing-library/react';
import { CommentRenderingProvider, useCommentRenderingContext } from './comment_rendering_context';
import { getMockCommentRenderingContext } from '../mock';

describe('CommentRenderingContext', () => {
  describe('useCommentRenderingContext', () => {
    it('returns an empty object when no provider is present', () => {
      const { result } = renderHook(() => useCommentRenderingContext());
      expect(result.current).toEqual({});
    });

    it('returns the provided context value', () => {
      const utils = getMockCommentRenderingContext({
        appId: 'securitySolution',
        loadingCommentIds: ['comment-1'],
        manageMarkdownEditIds: ['comment-2'],
      });

      const { result } = renderHook(() => useCommentRenderingContext(), {
        wrapper: ({ children }) => (
          <CommentRenderingProvider value={utils}>{children}</CommentRenderingProvider>
        ),
      });

      expect(result.current.appId).toBe('securitySolution');
      expect(result.current.loadingCommentIds).toEqual(['comment-1']);
      expect(result.current.manageMarkdownEditIds).toEqual(['comment-2']);
      expect(result.current.handleDeleteComment).toBeDefined();
    });
  });

  describe('CommentRenderingProvider', () => {
    it('renders children', () => {
      render(
        <CommentRenderingProvider value={getMockCommentRenderingContext()}>
          <div data-test-subj="test-child">{'Hello'}</div>
        </CommentRenderingProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('provides context to deeply nested children', () => {
      const handleDelete = jest.fn();
      const utils = getMockCommentRenderingContext({
        handleDeleteComment: handleDelete,
      });

      const Consumer: React.FC = () => {
        const { handleDeleteComment: onDelete } = useCommentRenderingContext();
        return (
          <button type="button" onClick={() => onDelete?.('id', 'title')}>
            {'Delete'}
          </button>
        );
      };

      render(
        <CommentRenderingProvider value={utils}>
          <div>
            <Consumer />
          </div>
        </CommentRenderingProvider>
      );

      screen.getByRole('button', { name: 'Delete' }).click();
      expect(handleDelete).toHaveBeenCalledWith('id', 'title');
    });
  });
});
