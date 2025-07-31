/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { InputCheckbox, PageSelectionCheckbox } from './table_selection_checkbox';
import { ConversationTableItem } from './types';

describe('PageSelectionCheckbox', () => {
  it('should render null when conversationOptionsIds is empty', () => {
    const { container } = render(
      <PageSelectionCheckbox
        conversationOptions={[]}
        deletedConversationsIds={[]}
        excludedIds={[]}
        handlePageChecked={jest.fn()}
        handlePageUnchecked={jest.fn()}
        isExcludedMode={false}
        totalItemCount={0}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('page selection checkbox be checked isExcludedMode is true, and excludedIds does not includes conversationOptionsIds', () => {
    const conversationOptions: ConversationTableItem[] = [
      { id: 'conversation1', title: 'Conversation 1' } as ConversationTableItem,
    ];
    const deletedConversationsIds: string[] = [];
    const excludedIds: string[] = ['conversation2'];
    const handlePageChecked = jest.fn();
    const handlePageUnchecked = jest.fn();
    const isExcludedMode = true;
    const totalItemCount = 2;

    const { getByTestId } = render(
      <PageSelectionCheckbox
        conversationOptions={conversationOptions}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        handlePageChecked={handlePageChecked}
        handlePageUnchecked={handlePageUnchecked}
        isExcludedMode={isExcludedMode}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId('conversationPageSelect');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('page selection checkbox should be unchecked when isExcludedMode is true, and not any conversationOptionsId are included in excludedIds', () => {
    const conversationOptions: ConversationTableItem[] = [
      { id: 'conversation1', title: 'Conversation 1' } as ConversationTableItem,
    ];
    const deletedConversationsIds: string[] = ['conversation2'];
    const excludedIds: string[] = ['conversation1'];
    const handlePageChecked = jest.fn();
    const handlePageUnchecked = jest.fn();
    const isExcludedMode = true;
    const totalItemCount = 2;
    const { getByTestId } = render(
      <PageSelectionCheckbox
        conversationOptions={conversationOptions}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        handlePageChecked={handlePageChecked}
        handlePageUnchecked={handlePageUnchecked}
        isExcludedMode={isExcludedMode}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId('conversationPageSelect');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('page selection checkbox should be checked when isExcludedMode is false and every conversationOptionsIds is included in deletedConversationsIds', () => {
    const conversationOptions: ConversationTableItem[] = [
      { id: 'conversation1', title: 'Conversation 1' } as ConversationTableItem,
      { id: 'conversation2', title: 'Conversation 2' } as ConversationTableItem,
    ];
    const deletedConversationsIds: string[] = ['conversation1', 'conversation2'];
    const excludedIds: string[] = [];
    const handlePageChecked = jest.fn();
    const handlePageUnchecked = jest.fn();
    const isExcludedMode = false;
    const totalItemCount = 2;
    const { getByTestId } = render(
      <PageSelectionCheckbox
        conversationOptions={conversationOptions}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        handlePageChecked={handlePageChecked}
        handlePageUnchecked={handlePageUnchecked}
        isExcludedMode={isExcludedMode}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId('conversationPageSelect');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('page selection checkbox should be unchecked when isExcludedMode is false and not all conversationOptionsIds are included in deletedConversationsIds', () => {
    const conversationOptions: ConversationTableItem[] = [
      { id: 'conversation1', title: 'Conversation 1' } as ConversationTableItem,
      { id: 'conversation2', title: 'Conversation 2' } as ConversationTableItem,
    ];
    const deletedConversationsIds: string[] = ['conversation1'];
    const excludedIds: string[] = [];
    const handlePageChecked = jest.fn();
    const handlePageUnchecked = jest.fn();
    const isExcludedMode = false;
    const totalItemCount = 2;
    const { getByTestId } = render(
      <PageSelectionCheckbox
        conversationOptions={conversationOptions}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        handlePageChecked={handlePageChecked}
        handlePageUnchecked={handlePageUnchecked}
        isExcludedMode={isExcludedMode}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId('conversationPageSelect');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });
});

describe('InputCheckbox', () => {
  it('input checkbox should be checked when isExcludedMode is true, and conversationOptionsId is not included in excludedIds', () => {
    const conversation: ConversationTableItem = {
      id: 'conversation1',
      title: 'Conversation 1',
    } as ConversationTableItem;
    const deletedConversationsIds: string[] = ['conversation2'];
    const excludedIds: string[] = ['conversation2'];
    const handleRowChecked = jest.fn();
    const handleRowUnChecked = jest.fn();
    const isExcludedMode = true;
    const totalItemCount = 1;
    const { getByTestId } = render(
      <InputCheckbox
        conversation={conversation}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        isExcludedMode={isExcludedMode}
        handleRowChecked={handleRowChecked}
        handleRowUnChecked={handleRowUnChecked}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId(`conversationSelect-${conversation.id}`);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('input checkbox should be unchecked when isExcludedMode is true, and conversationOptionsId is included in excludedIds', () => {
    const conversation: ConversationTableItem = {
      id: 'conversation1',
      title: 'Conversation 1',
    } as ConversationTableItem;
    const deletedConversationsIds: string[] = ['conversation2'];
    const excludedIds: string[] = ['conversation1'];
    const handleRowChecked = jest.fn();
    const handleRowUnChecked = jest.fn();
    const isExcludedMode = true;
    const totalItemCount = 1;
    const { getByTestId } = render(
      <InputCheckbox
        conversation={conversation}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        isExcludedMode={isExcludedMode}
        handleRowChecked={handleRowChecked}
        handleRowUnChecked={handleRowUnChecked}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId(`conversationSelect-${conversation.id}`);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('input checkbox should be checked when isExcludedMode is false, and conversationOptionsId is included in deletedConversationsIds', () => {
    const conversation: ConversationTableItem = {
      id: 'conversation1',
      title: 'Conversation 1',
    } as ConversationTableItem;
    const deletedConversationsIds: string[] = ['conversation1'];
    const excludedIds: string[] = [];
    const handleRowChecked = jest.fn();
    const handleRowUnChecked = jest.fn();
    const isExcludedMode = false;
    const totalItemCount = 1;
    const { getByTestId } = render(
      <InputCheckbox
        conversation={conversation}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        isExcludedMode={isExcludedMode}
        handleRowChecked={handleRowChecked}
        handleRowUnChecked={handleRowUnChecked}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId(`conversationSelect-${conversation.id}`);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('input checkbox should be unchecked when isExcludedMode is false, and conversationOptionsId is not included in deletedConversationsIds', () => {
    const conversation: ConversationTableItem = {
      id: 'conversation1',
      title: 'Conversation 1',
    } as ConversationTableItem;
    const deletedConversationsIds: string[] = [];
    const excludedIds: string[] = [];
    const handleRowChecked = jest.fn();
    const handleRowUnChecked = jest.fn();
    const isExcludedMode = false;
    const totalItemCount = 1;
    const { getByTestId } = render(
      <InputCheckbox
        conversation={conversation}
        deletedConversationsIds={deletedConversationsIds}
        excludedIds={excludedIds}
        isExcludedMode={isExcludedMode}
        handleRowChecked={handleRowChecked}
        handleRowUnChecked={handleRowUnChecked}
        totalItemCount={totalItemCount}
      />
    );
    const checkbox = getByTestId(`conversationSelect-${conversation.id}`);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });
});
