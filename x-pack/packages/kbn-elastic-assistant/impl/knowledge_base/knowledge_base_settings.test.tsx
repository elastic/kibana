/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { KnowledgeBaseSettings } from './knowledge_base_settings';
import { TestProviders } from '../mock/test_providers/test_providers';
import { useKnowledgeBaseStatus } from './use_knowledge_base_status';

const setUpdatedKnowledgeBaseSettings = jest.fn();
const defaultProps = {
  knowledgeBase: {
    assistantLangChain: true,
  },
  setUpdatedKnowledgeBaseSettings,
};
const mockDelete = jest.fn();
jest.mock('./use_delete_knowledge_base', () => ({
  useDeleteKnowledgeBase: jest.fn(() => {
    return {
      mutate: mockDelete,
      isLoading: false,
    };
  }),
}));

const mockSetup = jest.fn();
jest.mock('./use_setup_knowledge_base', () => ({
  useSetupKnowledgeBase: jest.fn(() => {
    return {
      mutate: mockSetup,
      isLoading: false,
    };
  }),
}));

jest.mock('./use_knowledge_base_status', () => ({
  useKnowledgeBaseStatus: jest.fn(() => {
    return {
      data: {
        elser_exists: true,
        esql_exists: true,
        index_exists: true,
        pipeline_exists: true,
      },
      isLoading: false,
      isFetching: false,
    };
  }),
}));

describe('Knowledge base settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Shows correct description when esql is installed', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('esql-installed')).toBeInTheDocument();
    expect(queryByTestId('install-esql')).not.toBeInTheDocument();
    expect(getByTestId('esqlEnableButton')).toBeInTheDocument();
  });
  it('On click enable esql button, esql is enabled', () => {
    (useKnowledgeBaseStatus as jest.Mock).mockImplementation(() => {
      return {
        data: {
          elser_exists: true,
          esql_exists: false,
          index_exists: true,
          pipeline_exists: true,
        },
        isLoading: false,
        isFetching: false,
      };
    });
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('esql-installed')).not.toBeInTheDocument();
    expect(getByTestId('install-esql')).toBeInTheDocument();
    fireEvent.click(getByTestId('esqlEnableButton'));
    expect(mockSetup).toHaveBeenCalledWith('esql');
  });
  it('On disable lang chain, set assistantLangChain to false', () => {
    const { getByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('assistantLangChainSwitch'));
    expect(setUpdatedKnowledgeBaseSettings).toHaveBeenCalledWith({
      assistantLangChain: false,
    });

    expect(mockSetup).not.toHaveBeenCalled();
  });
  it('On enable lang chain, set up with esql by default if ELSER exists', () => {
    const { getByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings
          {...defaultProps}
          knowledgeBase={{
            assistantLangChain: false,
          }}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('assistantLangChainSwitch'));
    expect(setUpdatedKnowledgeBaseSettings).toHaveBeenCalledWith({
      assistantLangChain: true,
    });

    expect(mockSetup).toHaveBeenCalledWith('esql');
  });
  it('On disable knowledge base, call delete knowledge base setup', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('install-kb')).not.toBeInTheDocument();
    expect(getByTestId('kb-installed')).toBeInTheDocument();
    fireEvent.click(getByTestId('knowledgeBaseActionButton'));
    expect(mockDelete).toHaveBeenCalledWith();
  });
  it('On enable knowledge base, call setup knowledge base setup', () => {
    (useKnowledgeBaseStatus as jest.Mock).mockImplementation(() => {
      return {
        data: {
          elser_exists: true,
          esql_exists: false,
          index_exists: false,
          pipeline_exists: false,
        },
        isLoading: false,
        isFetching: false,
      };
    });
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('kb-installed')).not.toBeInTheDocument();
    expect(getByTestId('install-kb')).toBeInTheDocument();
    fireEvent.click(getByTestId('knowledgeBaseActionButton'));
    expect(mockSetup).toHaveBeenCalledWith();
  });
  it('If elser does not exist, do not offer knowledge base', () => {
    (useKnowledgeBaseStatus as jest.Mock).mockImplementation(() => {
      return {
        data: {
          elser_exists: false,
          esql_exists: false,
          index_exists: false,
          pipeline_exists: false,
        },
        isLoading: false,
        isFetching: false,
      };
    });
    const { queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('knowledgeBaseActionButton')).not.toBeInTheDocument();
  });
});
