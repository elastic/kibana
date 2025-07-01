/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';
import { useGenAIConnectors, useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { render } from '../../helpers/test_helper';
import { useCreateKnowledgeBaseEntry } from '../../hooks/use_create_knowledge_base_entry';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
import { useGetKnowledgeBaseEntries } from '../../hooks/use_get_knowledge_base_entries';
import { useImportKnowledgeBaseEntries } from '../../hooks/use_import_knowledge_base_entries';
import { KnowledgeBaseTab } from './knowledge_base_tab';

jest.mock('../../hooks/use_get_knowledge_base_entries');
jest.mock('../../hooks/use_create_knowledge_base_entry');
jest.mock('../../hooks/use_import_knowledge_base_entries');
jest.mock('../../hooks/use_delete_knowledge_base_entry');
jest.mock('@kbn/ai-assistant/src/hooks');
jest.mock('@kbn/ai-assistant/src/hooks/use_inference_endpoints', () => ({
  useInferenceEndpoints: () => ({
    inferenceEndpoints: [{ inference_id: 'id1' }, { inference_id: 'id2' }],
    isLoading: false,
  }),
}));

const useGetKnowledgeBaseEntriesMock = useGetKnowledgeBaseEntries as jest.Mock;
const useCreateKnowledgeBaseEntryMock = useCreateKnowledgeBaseEntry as jest.Mock;
const useImportKnowledgeBaseEntriesMock = useImportKnowledgeBaseEntries as jest.Mock;
const useDeleteKnowledgeBaseEntryMock = useDeleteKnowledgeBaseEntry as jest.Mock;
const useGenAIConnectorsMock = useGenAIConnectors as jest.Mock;
const useKnowledgeBaseMock = useKnowledgeBase as jest.Mock;

const createMock = jest.fn(() => Promise.resolve());
const importMock = jest.fn(() => Promise.resolve());
const deleteMock = jest.fn(() => Promise.resolve());

describe('KnowledgeBaseTab', () => {
  beforeEach(() => {
    useGetKnowledgeBaseEntriesMock.mockReturnValue({
      loading: false,
      entries: [],
    });

    useDeleteKnowledgeBaseEntryMock.mockReturnValue({
      mutateAsync: deleteMock,
      isLoading: false,
    });

    useGenAIConnectorsMock.mockReturnValue({
      loading: false,
      connectors: [{ id: 'test', name: 'test' }],
      selectConnector: jest.fn(),
      reloadConnectors: jest.fn(),
    });
  });

  describe('when the knowledge base status is being fetched', () => {
    beforeEach(() => {
      useKnowledgeBaseMock.mockReturnValue({
        status: {
          value: {
            kbState: KnowledgeBaseState.NOT_INSTALLED,
            enabled: true,
          },
          loading: true,
        },
        isInstalling: false,
        isPolling: false,
        install: jest.fn(),
      });
    });

    it('should show a loader', () => {
      const { getByTestId } = render(<KnowledgeBaseTab />);
      expect(getByTestId('knowledgeBaseTabLoader')).toBeInTheDocument();
    });
  });

  describe('when the knowledge base is not installed', () => {
    beforeEach(() => {
      useKnowledgeBaseMock.mockReturnValue({
        status: {
          value: {
            kbState: KnowledgeBaseState.NOT_INSTALLED,
            enabled: true,
          },
          loading: false,
        },
        isInstalling: false,
        install: jest.fn(),
      });
    });

    it('should render the Install Knowledge base setup', () => {
      const { getByTestId } = render(<KnowledgeBaseTab />);
      expect(
        getByTestId('observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton')
      ).toBeInTheDocument();
    });
  });

  describe('when the knowledge base is re-indexing', () => {
    beforeEach(() => {
      useKnowledgeBaseMock.mockReturnValue({
        status: {
          value: {
            kbState: KnowledgeBaseState.READY,
            enabled: true,
            isReIndexing: true,
          },
        },
        isInstalling: false,
        install: jest.fn(),
      });
    });

    it('should show a warning callout while re-indexing is in progress', async () => {
      const { getByTestId, queryByTestId, rerender } = render(<KnowledgeBaseTab />);
      expect(getByTestId('knowledgeBaseReindexingCallOut')).toBeInTheDocument();

      // Re-indexing completed
      useKnowledgeBaseMock.mockReturnValue({
        status: {
          value: {
            kbState: KnowledgeBaseState.READY,
            enabled: true,
            isReIndexing: false,
          },
        },
        isInstalling: false,
        install: jest.fn(),
      });

      await act(async () => {
        rerender(<KnowledgeBaseTab />);
      });

      // Callout is no longer shown
      expect(queryByTestId('knowledgeBaseReindexingCallOut')).not.toBeInTheDocument();
    });
  });

  describe('when the knowledge base is installed and ready', () => {
    beforeEach(() => {
      useKnowledgeBaseMock.mockReturnValue({
        status: {
          value: {
            kbState: KnowledgeBaseState.READY,
            enabled: true,
          },
        },
        isInstalling: false,
        install: jest.fn(),
      });
    });

    it('should render a table', () => {
      const { getByTestId } = render(<KnowledgeBaseTab />);
      expect(getByTestId('knowledgeBaseTable')).toBeInTheDocument();
    });

    describe('when creating a new item', () => {
      beforeEach(() => {
        useCreateKnowledgeBaseEntryMock.mockReturnValue({
          mutateAsync: createMock,
          isLoading: false,
        });
      });

      it('should render a manual import flyout', () => {
        const { getByTestId } = render(<KnowledgeBaseTab />);

        fireEvent.click(getByTestId('knowledgeBaseNewEntryButton'));

        fireEvent.click(getByTestId('knowledgeBaseSingleEntryContextMenuItem'));

        expect(getByTestId('knowledgeBaseManualEntryFlyout')).toBeInTheDocument();
      });

      it('should allow creating of an item', () => {
        const { getByTestId } = render(<KnowledgeBaseTab />);

        fireEvent.click(getByTestId('knowledgeBaseNewEntryButton'));

        fireEvent.click(getByTestId('knowledgeBaseSingleEntryContextMenuItem'));

        fireEvent.change(getByTestId('knowledgeBaseEditManualEntryFlyoutIdInput'), {
          target: { value: 'foo' },
        });

        fireEvent.change(getByTestId('euiMarkdownEditorTextArea'), {
          target: { value: 'bar' },
        });

        getByTestId('knowledgeBaseEditManualEntryFlyoutSaveButton').click();

        expect(createMock).toHaveBeenCalledWith({
          entry: {
            id: expect.any(String),
            title: 'foo',
            public: false,
            text: 'bar',
            role: 'user_entry',
            labels: expect.any(Object),
          },
        });
      });

      it('should require an id', () => {
        const { getByTestId } = render(<KnowledgeBaseTab />);

        fireEvent.click(getByTestId('knowledgeBaseNewEntryButton'));

        fireEvent.click(getByTestId('knowledgeBaseSingleEntryContextMenuItem'));

        fireEvent.change(getByTestId('knowledgeBaseEditManualEntryFlyoutIdInput'), {
          target: { value: 'foo' },
        });

        expect(getByTestId('knowledgeBaseEditManualEntryFlyoutSaveButton')).toBeDisabled();
      });
    });

    describe('when importing a file', () => {
      beforeEach(() => {
        useImportKnowledgeBaseEntriesMock.mockReturnValue({
          mutateAsync: importMock,
          isLoading: false,
        });
      });

      it('should render an import flyout', () => {
        const { getByTestId } = render(<KnowledgeBaseTab />);

        fireEvent.click(getByTestId('knowledgeBaseNewEntryButton'));

        fireEvent.click(getByTestId('knowledgeBaseBulkImportContextMenuItem'));

        expect(getByTestId('knowledgeBaseBulkImportFlyout')).toBeInTheDocument();
      });
    });

    describe('when there are entries', () => {
      beforeEach(() => {
        useGetKnowledgeBaseEntriesMock.mockReturnValue({
          refetch: jest.fn(),
          loading: false,
          entries: [
            {
              id: 'test',
              title: 'test',
              text: 'test',
              '@timestamp': 1638340456,
              labels: {},
              role: 'user_entry',
            },
            {
              id: 'test2',
              title: 'test2',
              text: 'test',
              '@timestamp': 1638340456,
              labels: {
                category: 'lens',
              },
              role: 'elastic',
            },
            {
              id: 'test3',
              title: 'test3',
              text: 'test',
              '@timestamp': 1638340456,
              labels: {
                category: 'lens',
              },
              role: 'elastic',
            },
          ],
        });

        useImportKnowledgeBaseEntriesMock.mockReturnValue({
          mutateAsync: importMock,
          isLoading: false,
        });

        useDeleteKnowledgeBaseEntryMock.mockReturnValue({
          mutateAsync: deleteMock,
        });

        useCreateKnowledgeBaseEntryMock.mockReturnValue({
          mutateAsync: createMock,
          isLoading: false,
        });
      });

      describe('when selecting an item', () => {
        it('should render an edit flyout when clicking on an entry', () => {
          const { getByTestId } = render(<KnowledgeBaseTab />);

          fireEvent.click(getByTestId('knowledgeBaseTable').querySelectorAll('tbody tr')[0]);

          expect(getByTestId('knowledgeBaseManualEntryFlyout')).toBeInTheDocument();
        });

        it('should be able to delete an item', () => {
          const { getByTestId } = render(<KnowledgeBaseTab />);

          fireEvent.click(getByTestId('knowledgeBaseTable').querySelectorAll('tbody tr')[0]);

          fireEvent.click(getByTestId('knowledgeBaseEditManualEntryFlyoutDeleteEntryButton'));

          expect(deleteMock).toHaveBeenCalledWith({ id: 'test' });
        });

        it('should render a category flyout when clicking on a categorized item', () => {
          const { getByTestId } = render(<KnowledgeBaseTab />);

          fireEvent.click(getByTestId('knowledgeBaseTable').querySelectorAll('tbody tr')[1]);

          expect(getByTestId('knowledgeBaseCategoryFlyout')).toBeInTheDocument();
        });
      });
    });
  });
});
