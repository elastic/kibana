/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { monaco } from '@kbn/monaco';
import type {
  ActionConnector,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { WorkflowDetailConnectorFlyout } from './workflow_detail_connector_flyout';
import {
  openCreateConnectorFlyout,
  openEditConnectorFlyout,
} from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import type { useAsyncThunk } from '../../../hooks/use_async_thunk';
import { createMockMonacoEditor, TestWrapper } from '../../../shared/test_utils';

// Mock hooks
const mockUseKibana = jest.fn();
const mockUseAsyncThunk = jest.fn();
const mockUseFetchConnector = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../../hooks/use_async_thunk', () => ({
  useAsyncThunk: (thunk: Parameters<typeof useAsyncThunk>[0]) => mockUseAsyncThunk(thunk),
}));

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useFetchConnector: (connectorId?: string) => mockUseFetchConnector(connectorId),
}));

describe('WorkflowDetailConnectorFlyout', () => {
  const mockEditorRef = {
    current: null,
  } as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  const mockGetAddConnectorFlyout = jest.fn<
    ReturnType<TriggersAndActionsUIPublicPluginStart['getAddConnectorFlyout']>,
    Parameters<TriggersAndActionsUIPublicPluginStart['getAddConnectorFlyout']>
  >();
  const mockGetEditConnectorFlyout = jest.fn<
    ReturnType<TriggersAndActionsUIPublicPluginStart['getEditConnectorFlyout']>,
    Parameters<TriggersAndActionsUIPublicPluginStart['getEditConnectorFlyout']>
  >();
  const mockLoadConnectors = jest.fn();

  const mockConnector = {
    id: 'connector-123',
    name: 'Test Connector',
    actionTypeId: 'test-action-type',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  } as ActionConnector;

  const mockInsertPosition = {
    lineNumber: 5,
    column: 10,
  };

  // A real model, so `getLineMaxColumn` and `pushEditOperations` are Monaco's own; the editor
  // around it is the shared double (its single cast lives in `createMockMonacoEditor`).
  const createMockEditor = (): monaco.editor.IStandaloneCodeEditor => {
    const model = monaco.editor.createModel(
      Array.from({ length: 10 }, () => 'a'.repeat(49)).join('\n')
    );
    jest.spyOn(model, 'pushEditOperations');
    return createMockMonacoEditor('', { getModel: () => model }).editor;
  };

  const renderComponent = (store = createMockStore()) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };
    return {
      ...render(<WorkflowDetailConnectorFlyout editorRef={mockEditorRef} />, { wrapper }),
      store,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEditorRef.current = createMockEditor();

    mockUseKibana.mockReturnValue({
      services: {
        triggersActionsUi: {
          getAddConnectorFlyout: mockGetAddConnectorFlyout,
          getEditConnectorFlyout: mockGetEditConnectorFlyout,
        },
      },
    });

    mockUseAsyncThunk.mockReturnValue(mockLoadConnectors);

    mockUseFetchConnector.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    mockGetAddConnectorFlyout.mockReturnValue(<div data-test-subj="add-connector-flyout" />);
    mockGetEditConnectorFlyout.mockReturnValue(<div data-test-subj="edit-connector-flyout" />);
  });

  afterEach(() => {
    mockEditorRef.current?.getModel()?.dispose();
  });

  describe('when flyout is closed', () => {
    it('should return null', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when connectorType is not set', () => {
    it('should return null even if flyout is open', () => {
      const { store, container } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: '',
          })
        );
      });
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when creating a new connector', () => {
    it('should open the add connector flyout', () => {
      const { store, getByTestId } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });
      expect(getByTestId('add-connector-flyout')).toBeInTheDocument();
      expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith({
        initialConnector: { actionTypeId: 'test-action-type' },
        onClose: expect.any(Function),
        onConnectorCreated: expect.any(Function),
        onConnectorUpdated: expect.any(Function),
      });
    });

    it('should call closeConnectorFlyout when onClose is triggered', () => {
      let onCloseCallback: (() => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onCloseCallback = config.onClose;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
          })
        );
      });

      expect(onCloseCallback).toBeDefined();
      act(() => {
        onCloseCallback!();
      });
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });

    it('reloads connectors when a created connector is edited without inserting the id again', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      let onConnectorUpdatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        onConnectorUpdatedCallback = config.onConnectorUpdated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: '.dual',
            insertPosition: mockInsertPosition,
          })
        );
      });

      act(() => {
        onConnectorCreatedCallback!({
          ...mockConnector,
          actionTypeId: '.dual',
          isInboundEventsEnabled: true,
        });
      });

      const editorModel = mockEditorRef.current?.getModel();
      expect(editorModel?.pushEditOperations).toHaveBeenCalledTimes(1);
      (editorModel?.pushEditOperations as jest.Mock).mockClear();
      mockLoadConnectors.mockClear();

      act(() => {
        onConnectorUpdatedCallback!({
          ...mockConnector,
          actionTypeId: '.dual',
          isInboundEventsEnabled: false,
          name: 'Renamed',
        });
      });

      expect(mockLoadConnectors).toHaveBeenCalledTimes(1);
      expect(editorModel?.pushEditOperations).not.toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(true);
    });

    it('should insert connector ID and reload connectors when onConnectorCreated is triggered', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      act(() => {
        onConnectorCreatedCallback!(mockConnector);
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);

      // Verify editor insert operation
      const editorModel = mockEditorRef.current?.getModel();
      expect(editorModel?.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: expect.any(monaco.Range),
            text: 'connector-123',
          },
        ],
        expect.any(Function)
      );
    });

    it('should not insert connector ID when insertPosition is not provided', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      act(() => {
        onConnectorCreatedCallback!(mockConnector);
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);

      // Verify editor insert operation was not called
      const editorModel = mockEditorRef.current?.getModel();
      expect(editorModel?.pushEditOperations).not.toHaveBeenCalled();
    });

    it('hands the created connector id back to the form field that asked for it', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({ connectorType: 'test-action-type', requestId: 'field-1' })
        );
      });
      act(() => {
        onConnectorCreatedCallback!(mockConnector);
      });

      expect(store.getState().detail.lastCreatedConnector).toEqual({
        requestId: 'field-1',
        id: 'connector-123',
      });
      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
      expect(mockEditorRef.current?.getModel()?.pushEditOperations).not.toHaveBeenCalled();
    });

    it('reports no created connector when no form field asked for it', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(openCreateConnectorFlyout({ connectorType: 'test-action-type' }));
      });
      act(() => {
        onConnectorCreatedCallback!(mockConnector);
      });

      expect(store.getState().detail.lastCreatedConnector).toBeUndefined();
    });

    it('keeps the flyout open after creating an inbound webhook so the ingest token remains visible', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: '.inboundWebhook',
            insertPosition: mockInsertPosition,
          })
        );
      });

      act(() => {
        onConnectorCreatedCallback!({
          ...mockConnector,
          id: 'testong',
          actionTypeId: '.inboundWebhook',
        });
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(true);
      const editorModel = mockEditorRef.current?.getModel();
      expect(editorModel?.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: expect.any(monaco.Range),
            text: 'testong',
          },
        ],
        expect.any(Function)
      );
    });

    it('closes after creating a dual connector with inbound events off', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: '.dual',
          })
        );
      });

      act(() => {
        onConnectorCreatedCallback!({
          ...mockConnector,
          actionTypeId: '.dual',
          isInboundEventsEnabled: false,
        });
      });

      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });

    it('keeps the flyout open after creating a dual connector with inbound events on', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: '.dual',
          })
        );
      });

      act(() => {
        onConnectorCreatedCallback!({
          ...mockConnector,
          actionTypeId: '.dual',
          isInboundEventsEnabled: true,
        });
      });

      expect(store.getState().detail.connectorFlyout.isOpen).toBe(true);
    });
  });

  describe('when editing an existing connector', () => {
    it('should wait for connector to load before opening edit flyout', () => {
      mockUseFetchConnector.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { store, container } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(container.firstChild).toBeNull();
      expect(mockGetEditConnectorFlyout).not.toHaveBeenCalled();
    });

    it('should open the edit connector flyout when connector is loaded', () => {
      mockUseFetchConnector.mockReturnValue({
        data: mockConnector,
        isLoading: false,
      });

      const { store, getByTestId } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(getByTestId('edit-connector-flyout')).toBeInTheDocument();
      expect(mockGetEditConnectorFlyout).toHaveBeenCalledWith({
        connector: mockConnector,
        onClose: expect.any(Function),
        onConnectorUpdated: expect.any(Function),
      });
    });

    it('should call closeConnectorFlyout when onClose is triggered', () => {
      let onCloseCallback: (() => void) | undefined;
      mockGetEditConnectorFlyout.mockImplementation((config) => {
        onCloseCallback = config.onClose;
        return <div data-test-subj="edit-connector-flyout" />;
      });

      mockUseFetchConnector.mockReturnValue({
        data: mockConnector,
        isLoading: false,
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(onCloseCallback).toBeDefined();
      act(() => {
        onCloseCallback!();
      });
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });

    it('should reload connectors and close flyout when onConnectorUpdated is triggered', () => {
      let onConnectorUpdatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetEditConnectorFlyout.mockImplementation((config) => {
        onConnectorUpdatedCallback = config.onConnectorUpdated;
        return <div data-test-subj="edit-connector-flyout" />;
      });

      mockUseFetchConnector.mockReturnValue({
        data: mockConnector,
        isLoading: false,
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(onConnectorUpdatedCallback).toBeDefined();
      act(() => {
        onConnectorUpdatedCallback!(mockConnector);
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });
  });

  describe('insertConnectorId function', () => {
    it('should handle errors gracefully when editor model is unavailable', () => {
      mockEditorRef.current = null;

      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      // Should not throw error
      expect(() => {
        act(() => {
          onConnectorCreatedCallback!(mockConnector);
        });
      }).not.toThrow();
    });

    it('should handle errors gracefully when pushEditOperations fails', () => {
      const model = mockEditorRef.current?.getModel();
      if (!model) throw new Error('the mock editor has no model');
      jest.spyOn(model, 'pushEditOperations').mockImplementation(() => {
        throw new Error('Edit operation failed');
      });

      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      // Should not throw error
      expect(() => {
        act(() => {
          onConnectorCreatedCallback!(mockConnector);
        });
      }).not.toThrow();
      expect(model.pushEditOperations).toHaveBeenCalledTimes(1);
    });
  });
});
