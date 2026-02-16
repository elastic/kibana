/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { SchemaEditorFlyout } from '.';
import { createMockClassicStreamDefinition, createMockMappedField } from '../../shared/mocks';
import type { SchemaField } from '../types';

// Mock the useKibana hook
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      docLinks: {
        links: {
          elasticsearch: {
            mappingParameters: 'https://elastic.co/docs/mapping-parameters',
          },
        },
      },
    },
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: jest.fn(),
          },
        },
        fieldsMetadata: {
          useFieldsMetadata: () => ({
            fieldsMetadata: {},
            loading: false,
          }),
        },
      },
    },
  }),
}));

// Mock the useStreamsAppRouter hook
jest.mock('../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: jest.fn(() => '/mock-link'),
  }),
}));

// Mock the useStreamsAppFetch hook used by SamplePreviewTable
jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: () => ({
    value: null,
    loading: false,
    error: null,
  }),
}));

// Mock CodeEditor to avoid Monaco initialization in tests
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-testid="mock-code-editor">CodeEditor</div>,
}));

const renderFlyout = (
  fieldOverrides: Partial<SchemaField> = {},
  props: Partial<React.ComponentProps<typeof SchemaEditorFlyout>> = {}
) => {
  const defaultField = createMockMappedField({
    name: 'test.field',
    type: 'keyword',
    parent: 'logs.test',
    ...fieldOverrides,
  });

  const definition = createMockClassicStreamDefinition();

  return render(
    <I18nProvider>
      <SchemaEditorFlyout
        field={defaultField}
        stream={definition.stream}
        onClose={jest.fn()}
        onStage={jest.fn()}
        withFieldSimulation={true}
        {...props}
      />
    </I18nProvider>
  );
};

describe('SchemaEditorFlyout', () => {
  describe('Alias field behavior', () => {
    it('does not render AdvancedFieldMappingOptions for alias fields', () => {
      renderFlyout({ alias_for: 'original.field' });

      // The accordion with "Advanced field mapping parameters" should not be present
      expect(screen.queryByText('Advanced field mapping parameters')).not.toBeInTheDocument();
    });

    it('does not render SamplePreviewTable for alias fields', () => {
      renderFlyout({ alias_for: 'original.field' });

      // When simulation would normally show a loading state or results,
      // for alias fields it should not render anything related to preview
      // The preview table shows "Couldn't simulate changes" or similar messages
      // when it renders - none of these should be present for alias fields
      expect(screen.queryByText(/simulate/i)).not.toBeInTheDocument();
    });

    it('renders "Go to source field" button for alias fields when onGoToField is provided', () => {
      const onGoToField = jest.fn();
      renderFlyout({ alias_for: 'original.field' }, { onGoToField });

      const goToFieldButton = screen.getByTestId('streamsAppFieldSummaryGoToFieldButton');
      expect(goToFieldButton).toBeInTheDocument();
      expect(goToFieldButton).toHaveTextContent('Go to source field');
    });

    it('calls onGoToField with the correct field name when "Go to source field" button is clicked', async () => {
      const user = userEvent.setup();
      const onGoToField = jest.fn();
      renderFlyout({ alias_for: 'original.field' }, { onGoToField });

      const goToFieldButton = screen.getByTestId('streamsAppFieldSummaryGoToFieldButton');
      await user.click(goToFieldButton);

      expect(onGoToField).toHaveBeenCalledWith('original.field');
    });

    it('does not render "Go to source field" button when onGoToField is not provided', () => {
      renderFlyout({ alias_for: 'original.field' }, { onGoToField: undefined });

      expect(screen.queryByTestId('streamsAppFieldSummaryGoToFieldButton')).not.toBeInTheDocument();
    });

    it('displays alias type indicator in field summary', () => {
      renderFlyout({ alias_for: 'original.field' });

      // The FieldType component should display "Alias for original.field"
      expect(screen.getByText('Alias for original.field')).toBeInTheDocument();
    });
  });

  describe('Non-alias field behavior', () => {
    it('renders AdvancedFieldMappingOptions for non-alias fields', () => {
      renderFlyout({ alias_for: undefined });

      expect(screen.getByText('Advanced field mapping parameters')).toBeInTheDocument();
    });

    it('does not render "Go to source field" button for non-alias fields', () => {
      const onGoToField = jest.fn();
      renderFlyout({ alias_for: undefined }, { onGoToField });

      expect(screen.queryByTestId('streamsAppFieldSummaryGoToFieldButton')).not.toBeInTheDocument();
    });

    it('displays field type for non-alias fields', () => {
      renderFlyout({ type: 'keyword', alias_for: undefined });

      // Should show "Keyword" type, not an alias indicator
      expect(screen.queryByText(/Alias for/)).not.toBeInTheDocument();
      expect(screen.getByText('Keyword')).toBeInTheDocument();
    });
  });
});
