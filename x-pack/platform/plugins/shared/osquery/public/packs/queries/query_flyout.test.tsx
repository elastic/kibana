/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

// --- Kibana services ---
jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          osquery: {
            writeSavedQueries: true,
            readSavedQueries: true,
            writeLiveQueries: true,
            runSavedQueries: true,
          },
        },
      },
    },
  }),
}));

// --- Heavy child component stubs ---
jest.mock('../../saved_queries/form/code_editor_field', () => ({
  CodeEditorField: () => <div data-test-subj="codeEditorField">Editor</div>,
}));

jest.mock('./lazy_ecs_mapping_editor_field', () => ({
  ECSMappingEditorField: () => <div data-test-subj="ecsMappingEditor">ECS Mapping</div>,
}));

jest.mock('./platforms/platform_icon', () => ({
  PlatformIcon: ({ platform }: { platform: string }) => (
    <span data-test-subj={`icon-${platform}`} />
  ),
}));

// Track the onChange callback from SavedQueriesDropdown
let savedQueryOnChange: ((value: Record<string, unknown>) => void) | null = null;
jest.mock('../../saved_queries/saved_queries_dropdown', () => ({
  SavedQueriesDropdown: ({ onChange }: { onChange: (value: Record<string, unknown>) => void }) => {
    savedQueryOnChange = onChange;

    return <div data-test-subj="savedQueriesDropdown">Saved Queries</div>;
  },
}));

import { QueryFlyout } from './query_flyout';

const renderFlyout = (props: Partial<React.ComponentProps<typeof QueryFlyout>> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryFlyout uniqueQueryIds={[]} onSave={jest.fn()} onClose={jest.fn()} {...props} />
      </IntlProvider>
    </EuiProvider>
  );

describe('QueryFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savedQueryOnChange = null;
  });

  describe('add mode', () => {
    it('should show "Attach next query" title', () => {
      renderFlyout();
      expect(screen.getByText('Attach next query')).toBeInTheDocument();
    });

    it('should show saved queries dropdown', () => {
      renderFlyout();
      expect(screen.getByTestId('savedQueriesDropdown')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const defaultValue = {
      id: 'existing-query',
      query: 'select * from uptime;',
      interval: '3600',
      shards: {} as Record<string, number>,
    };

    it('should show "Edit query" title', () => {
      renderFlyout({ defaultValue });
      expect(screen.getByText('Edit query')).toBeInTheDocument();
    });

    it('should not show saved queries dropdown', () => {
      renderFlyout({ defaultValue });
      expect(screen.queryByTestId('savedQueriesDropdown')).not.toBeInTheDocument();
    });
  });

  describe('ID validation', () => {
    it('should show "ID must be unique" when entering a duplicate ID', async () => {
      renderFlyout({ uniqueQueryIds: ['existing-query'] });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'existing-query' } });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => {
        expect(screen.getByText('ID must be unique')).toBeInTheDocument();
      });
    });

    it('should show "ID must be unique" when saved query selection conflicts with existing ID', async () => {
      renderFlyout({ uniqueQueryIds: ['conflicting-query'] });

      // Simulate selecting a saved query whose ID conflicts — resetField triggers
      // React state updates, so wrap in act()
      expect(savedQueryOnChange).not.toBeNull();
      act(() => {
        savedQueryOnChange!({
          id: 'conflicting-query',
          query: 'select * from uptime;',
        });
      });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => {
        expect(screen.getByText('ID must be unique')).toBeInTheDocument();
      });
    });

    it('should not show uniqueness error when ID is unique', async () => {
      renderFlyout({ uniqueQueryIds: ['existing-query'] });

      const idInput = screen.getByRole('textbox', { name: /ID/i });
      fireEvent.change(idInput, { target: { value: 'brand-new-query' } });

      fireEvent.click(screen.getByTestId('query-flyout-save-button'));

      await waitFor(() => {
        expect(screen.queryByText('ID must be unique')).not.toBeInTheDocument();
      });
    });
  });

  describe('buttons', () => {
    it('should render Cancel and Save buttons', () => {
      renderFlyout();
      expect(screen.getByTestId('query-flyout-cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('query-flyout-save-button')).toBeInTheDocument();
    });

    it('should call onClose when Cancel is clicked', () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });

      fireEvent.click(screen.getByTestId('query-flyout-cancel-button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
