/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react';
import { useConversationSelection } from './use_conversation_selection';
import { ConversationTableItem } from './types';

describe('useConversationSelection', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useConversationSelection());
    expect(result.current.selectionState.isDeleteAll).toBe(false);
    expect(result.current.selectionState.isExcludedMode).toBe(false);
    expect(result.current.selectionState.deletedConversations).toEqual([]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(0);
    expect(result.current.selectionState.excludedIds).toEqual([]);
  });

  it('should handle unselect all', () => {
    const { result } = renderHook(() => useConversationSelection());
    act(() => {
      result.current.selectionActions.handleUnselectAll();
    });
    expect(result.current.selectionState.isDeleteAll).toBe(false);
    expect(result.current.selectionState.isExcludedMode).toBe(false);
    expect(result.current.selectionState.deletedConversations).toEqual([]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(0);
    expect(result.current.selectionState.excludedIds).toEqual([]);
  });

  it('should handle select all', () => {
    const totalItemCount = 5;
    const { result } = renderHook(() => useConversationSelection());
    act(() => {
      result.current.selectionActions.handleSelectAll(totalItemCount);
    });
    expect(result.current.selectionState.isDeleteAll).toBe(true);
    expect(result.current.selectionState.isExcludedMode).toBe(true);
    expect(result.current.selectionState.totalSelectedConversations).toBe(totalItemCount);
  });

  it('should handle selecting all conversations on the current page', () => {
    const { result } = renderHook(() => useConversationSelection());
    const conversationOptions = [
      { id: '1', title: 'Conversation 1' },
      { id: '2', title: 'Conversation 2' },
    ] as ConversationTableItem[];

    act(() => {
      result.current.selectionActions.handleRowChecked({
        selectedItem: conversationOptions[0],
        totalItemCount: 2,
      });
    });

    expect(result.current.selectionState.deletedConversations).toEqual([conversationOptions[0]]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(1);
    expect(result.current.selectionState.isDeleteAll).toBe(false);

    act(() => {
      result.current.selectionActions.handlePageChecked({
        conversationOptions,
        totalItemCount: 2,
      });
    });
    expect(result.current.selectionState.deletedConversations).toEqual(conversationOptions);
    expect(result.current.selectionState.totalSelectedConversations).toBe(2);
    expect(result.current.selectionState.isDeleteAll).toBe(true);
  });

  it('should handle page unselected', () => {
    const { result } = renderHook(() => useConversationSelection());
    const conversationOptions = [
      { id: '1', title: 'Conversation 1' },
      { id: '2', title: 'Conversation 2' },
    ] as ConversationTableItem[];
    const conversationOptionsIds = conversationOptions.map((item) => item.id);
    act(() => {
      result.current.selectionActions.handlePageChecked({
        conversationOptions,
        totalItemCount: 2,
      });
    });
    expect(result.current.selectionState.excludedIds).toEqual([]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(2);
    expect(result.current.selectionState.deletedConversations).toEqual(conversationOptions);
    expect(result.current.selectionState.isDeleteAll).toBe(true);
    expect(result.current.selectionState.isExcludedMode).toBe(true);

    act(() => {
      result.current.selectionActions.handlePageUnchecked({
        conversationOptionsIds,
        totalItemCount: 2,
      });
    });

    expect(result.current.selectionState.excludedIds).toEqual(['1', '2']);
    expect(result.current.selectionState.totalSelectedConversations).toBe(0);
    expect(result.current.selectionState.deletedConversations).toEqual([]);
    expect(result.current.selectionState.isDeleteAll).toBe(false);
    expect(result.current.selectionState.isExcludedMode).toBe(true);
  });
  it('should handle row checked', () => {
    const { result } = renderHook(() => useConversationSelection());
    const conversation = { id: '1', title: 'Conversation 1' } as ConversationTableItem;
    act(() => {
      result.current.selectionActions.handleRowChecked({
        selectedItem: conversation,
        totalItemCount: 1,
      });
    });
    expect(result.current.selectionState.deletedConversations).toEqual([conversation]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(1);
    expect(result.current.selectionState.isDeleteAll).toBe(true);
    expect(result.current.selectionState.isExcludedMode).toBe(true);
  });

  it('should handle row unchecked', () => {
    const { result } = renderHook(() => useConversationSelection());
    const conversation = { id: '1', title: 'Conversation 1' } as ConversationTableItem;
    act(() => {
      result.current.selectionActions.handleRowChecked({
        selectedItem: conversation,
        totalItemCount: 1,
      });
    });
    expect(result.current.selectionState.deletedConversations).toEqual([conversation]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(1);
    expect(result.current.selectionState.isDeleteAll).toBe(true);
    expect(result.current.selectionState.isExcludedMode).toBe(true);
    act(() => {
      result.current.selectionActions.handleRowUnChecked({
        selectedItem: conversation,
        totalItemCount: 1,
      });
    });
    expect(result.current.selectionState.deletedConversations).toEqual([]);
    expect(result.current.selectionState.totalSelectedConversations).toBe(0);
    expect(result.current.selectionState.isDeleteAll).toBe(false);
    expect(result.current.selectionState.isExcludedMode).toBe(true);
    expect(result.current.selectionState.excludedIds).toEqual(['1']);
  });
});
