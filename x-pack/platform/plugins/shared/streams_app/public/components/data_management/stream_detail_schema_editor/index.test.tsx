/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamDetailSchemaEditor } from '.';
import { I18nProvider } from '@kbn/i18n-react';
import {
  createMockClassicStreamDefinition,
  createMockWiredStreamDefinition,
} from '../shared/mocks';
import type { StreamsAppKibanaContext } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_stream_detail');
jest.mock('../../../hooks/use_discard_confirm');
jest.mock('../schema_editor/hooks/use_schema_fields', () => {
  const actual = jest.requireActual('../schema_editor/hooks/use_schema_fields');
  return {
    ...actual,
    useSchemaFields: jest.fn(),
  };
});
jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));
jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: jest.fn(() => ({
    onPageReady: jest.fn(),
  })),
}));

import { useKibana } from '../../../hooks/use_kibana';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';
import { useSchemaFields } from '../schema_editor/hooks/use_schema_fields';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseStreamDetail = useStreamDetail as jest.MockedFunction<typeof useStreamDetail>;
const mockUseDiscardConfirm = useDiscardConfirm as jest.MockedFunction<typeof useDiscardConfirm>;
const mockUseSchemaFields = useSchemaFields as jest.MockedFunction<typeof useSchemaFields>;
const mockUseUnsavedChangesPrompt = useUnsavedChangesPrompt as jest.MockedFunction<
  typeof useUnsavedChangesPrompt
>;

const mockRefreshDefinition = jest.fn();
const mockDiscardHandler = jest.fn();

describe('StreamDetailSchemaEditor', () => {
  const mockOpenModal = jest.fn();
  const mockOpenConfirm = jest.fn();
  const mockHistory: StreamsAppKibanaContext['appParams']['history'] = {
    push: jest.fn(),
    replace: jest.fn(),
    location: { pathname: '/streams/logs.test', search: '', state: undefined, hash: '' },
  } as unknown as StreamsAppKibanaContext['appParams']['history'];
  const mockNavigateToUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const kibanaContext: StreamsAppKibanaContext = {
      appParams: {
        history: mockHistory,
      } as unknown as StreamsAppKibanaContext['appParams'],
      core: {
        // Only properties actually used by this component are provided
        http: {
          basePath: {
            get: jest.fn(),
            prepend: jest.fn(),
            remove: jest.fn(),
          },
        } as unknown as StreamsAppKibanaContext['core']['http'],
        application: {
          navigateToUrl: mockNavigateToUrl,
        } as unknown as StreamsAppKibanaContext['core']['application'],
        overlays: {
          openModal: mockOpenModal,
          openConfirm: mockOpenConfirm,
        } as unknown as StreamsAppKibanaContext['core']['overlays'],
        notifications: {
          toasts: {
            addError: jest.fn(),
            addSuccess: jest.fn(),
          },
        } as unknown as StreamsAppKibanaContext['core']['notifications'],
      } as unknown as StreamsAppKibanaContext['core'],
      dependencies: {
        start: {
          fieldsMetadata: {
            getClient: jest.fn().mockResolvedValue({
              find: jest.fn().mockResolvedValue({ fields: {} }),
            }),
          },
        } as unknown as StreamsAppKibanaContext['dependencies']['start'],
      },
      services: {
        dataStreamsClient: Promise.resolve(
          {} as unknown as StreamsAppKibanaContext['services']['dataStreamsClient'] extends Promise<
            infer T
          >
            ? T
            : never
        ),
        telemetryClient: {
          trackSchemaUpdated: jest.fn(),
        } as unknown as StreamsAppKibanaContext['services']['telemetryClient'],
        version: 'test-version',
      },
      isServerless: false,
    };

    mockUseKibana.mockReturnValue(kibanaContext);

    mockUseStreamDetail.mockReturnValue({
      definition: createMockClassicStreamDefinition(),
      loading: false,
      refresh: mockRefreshDefinition,
    });

    mockUseDiscardConfirm.mockReturnValue(mockDiscardHandler);

    mockUseSchemaFields.mockReturnValue({
      fields: [],
      storedFields: [],
      isLoadingFields: false,
      refreshFields: jest.fn(),
      addField: jest.fn(),
      updateField: jest.fn(),
      pendingChangesCount: 0,
      discardChanges: jest.fn(),
      submitChanges: jest.fn(),
    });

    mockUseUnsavedChangesPrompt.mockImplementation(() => {});
  });

  describe('Rendering with different privilege levels', () => {
    it('renders with manage privileges', () => {
      const definition = createMockClassicStreamDefinition({
        privileges: {
          manage: true,
          monitor: true,
          lifecycle: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
          view_index_metadata: true,
        },
      });

      mockUseStreamDetail.mockReturnValue({
        definition,
        loading: false,
        refresh: mockRefreshDefinition,
      });

      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('streamsAppSchemaEditorFieldsTableLoaded')).toBeInTheDocument();
    });

    it('hides "Add field" button when manage privilege is false', () => {
      const definition = createMockClassicStreamDefinition({
        privileges: {
          manage: false,
          monitor: true,
          lifecycle: false,
          simulate: false,
          text_structure: false,
          read_failure_store: false,
          manage_failure_store: false,
          view_index_metadata: true,
        },
      });

      mockUseStreamDetail.mockReturnValue({
        definition,
        loading: false,
        refresh: mockRefreshDefinition,
      });

      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(screen.queryByTestId('streamsAppContentAddFieldButton')).not.toBeInTheDocument();
    });
  });

  describe('Root stream read-only callout', () => {
    it('displays read-only callout for root streams', () => {
      const definition = createMockWiredStreamDefinition({
        stream: {
          name: 'logs', // root stream
          description: '',
          updated_at: '2024-01-01T00:00:00.000Z',
          ingest: {
            lifecycle: { dsl: {} },
            processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
            settings: {},
            failure_store: { inherit: {} },
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
      });

      mockUseStreamDetail.mockReturnValue({
        definition,
        loading: false,
        refresh: mockRefreshDefinition,
      });

      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(
        screen.getByText(
          /Root streams are selectively immutable and their schema cannot be modified/
        )
      ).toBeInTheDocument();
    });

    it('does not display callout for non-root streams', () => {
      const definition = createMockWiredStreamDefinition({
        stream: {
          name: 'logs.child', // child stream
          description: '',
          updated_at: '2024-01-01T00:00:00.000Z',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
            settings: {},
            failure_store: { inherit: {} },
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
      });

      mockUseStreamDetail.mockReturnValue({
        definition,
        loading: false,
        refresh: mockRefreshDefinition,
      });

      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(
        screen.queryByText(
          /Root streams are selectively immutable and their schema cannot be modified/
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('Pending changes bottom bar', () => {
    it('displays bottom bar when there are pending changes', () => {
      mockUseSchemaFields.mockReturnValue({
        fields: [],
        storedFields: [],
        isLoadingFields: false,
        refreshFields: jest.fn(),
        addField: jest.fn(),
        updateField: jest.fn(),
        pendingChangesCount: 2,
        discardChanges: jest.fn(),
        submitChanges: jest.fn(),
      });

      const definition = createMockClassicStreamDefinition();
      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('streamsAppSchemaEditorDiscardChangesButton')).toBeInTheDocument();
      expect(
        screen.getByTestId('streamsAppSchemaEditorReviewStagedChangesButton')
      ).toBeInTheDocument();
      expect(screen.getByText(/changes pending/)).toBeInTheDocument();
    });

    it('does not display bottom bar when there are no pending changes', () => {
      mockUseSchemaFields.mockReturnValue({
        fields: [],
        storedFields: [],
        isLoadingFields: false,
        refreshFields: jest.fn(),
        addField: jest.fn(),
        updateField: jest.fn(),
        pendingChangesCount: 0,
        discardChanges: jest.fn(),
        submitChanges: jest.fn(),
      });

      const definition = createMockClassicStreamDefinition();
      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(
        screen.queryByTestId('streamsAppSchemaEditorDiscardChangesButton')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('streamsAppSchemaEditorReviewStagedChangesButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('Discard changes functionality', () => {
    it('calls discard handler when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockDiscardChanges = jest.fn();

      mockUseSchemaFields.mockReturnValue({
        fields: [],
        storedFields: [],
        isLoadingFields: false,
        refreshFields: jest.fn(),
        addField: jest.fn(),
        updateField: jest.fn(),
        pendingChangesCount: 1,
        discardChanges: mockDiscardChanges,
        submitChanges: jest.fn(),
      });

      const definition = createMockClassicStreamDefinition();
      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      const cancelButton = screen.getByTestId('streamsAppSchemaEditorDiscardChangesButton');
      await user.click(cancelButton);

      expect(mockDiscardHandler).toHaveBeenCalled();
    });
  });

  describe('Submit changes modal', () => {
    it('opens confirmation modal when submit button is clicked', async () => {
      const user = userEvent.setup();
      const mockCloseModal = jest.fn();
      mockOpenModal.mockReturnValue({ close: mockCloseModal });

      mockUseSchemaFields.mockReturnValue({
        fields: [],
        storedFields: [],
        isLoadingFields: false,
        refreshFields: jest.fn(),
        addField: jest.fn(),
        updateField: jest.fn(),
        pendingChangesCount: 1,
        discardChanges: jest.fn(),
        submitChanges: jest.fn(),
      });

      const definition = createMockClassicStreamDefinition();
      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      const submitButton = screen.getByTestId('streamsAppSchemaEditorReviewStagedChangesButton');
      await user.click(submitButton);

      expect(mockOpenModal).toHaveBeenCalled();
    });
  });

  describe('Unsaved changes prompt', () => {
    it('sets up unsaved changes prompt when there are pending changes', () => {
      mockUseSchemaFields.mockReturnValue({
        fields: [],
        storedFields: [],
        isLoadingFields: false,
        refreshFields: jest.fn(),
        addField: jest.fn(),
        updateField: jest.fn(),
        pendingChangesCount: 1,
        discardChanges: jest.fn(),
        submitChanges: jest.fn(),
      });

      const definition = createMockClassicStreamDefinition();
      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(mockUseUnsavedChangesPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          hasUnsavedChanges: true,
          history: mockHistory,
          http: expect.anything(),
          navigateToUrl: mockNavigateToUrl,
          openConfirm: mockOpenConfirm,
          shouldPromptOnReplace: false,
        })
      );
    });

    it('does not prompt when there are no pending changes', () => {
      mockUseSchemaFields.mockReturnValue({
        fields: [],
        storedFields: [],
        isLoadingFields: false,
        refreshFields: jest.fn(),
        addField: jest.fn(),
        updateField: jest.fn(),
        pendingChangesCount: 0,
        discardChanges: jest.fn(),
        submitChanges: jest.fn(),
      });

      const definition = createMockClassicStreamDefinition();
      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(mockUseUnsavedChangesPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          hasUnsavedChanges: false,
        })
      );
    });
  });

  describe('Add field button visibility', () => {
    it('shows add field button for non-root streams with manage privilege', () => {
      const definition = createMockClassicStreamDefinition({
        stream: {
          name: 'logs.child',
          description: '',
          updated_at: '2024-01-01T00:00:00.000Z',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
            settings: {},
            failure_store: { inherit: {} },
            classic: {
              field_overrides: {},
            },
          },
        },
        privileges: {
          manage: true,
          monitor: true,
          lifecycle: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
          view_index_metadata: true,
        },
      });

      mockUseStreamDetail.mockReturnValue({
        definition,
        loading: false,
        refresh: mockRefreshDefinition,
      });

      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('streamsAppContentAddFieldButton')).toBeInTheDocument();
    });

    it('hides add field button for root streams even with manage privilege', () => {
      const definition = createMockWiredStreamDefinition({
        stream: {
          name: 'logs', // root stream
          description: '',
          updated_at: '2024-01-01T00:00:00.000Z',
          ingest: {
            lifecycle: { dsl: {} },
            processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
            settings: {},
            failure_store: { inherit: {} },
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
        privileges: {
          manage: true,
          monitor: true,
          lifecycle: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
          view_index_metadata: true,
        },
      });

      mockUseStreamDetail.mockReturnValue({
        definition,
        loading: false,
        refresh: mockRefreshDefinition,
      });

      render(
        <I18nProvider>
          <StreamDetailSchemaEditor
            definition={definition}
            refreshDefinition={mockRefreshDefinition}
          />
        </I18nProvider>
      );

      expect(screen.queryByTestId('streamsAppContentAddFieldButton')).not.toBeInTheDocument();
    });
  });
});
