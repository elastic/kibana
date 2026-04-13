/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Streams } from '@kbn/streams-schema';
import type { SchemaField } from '../types';
import { SchemaEditorFlyout } from '.';

jest.mock('../../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: () => '#',
  }),
}));

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        fieldsMetadata: {
          useFieldsMetadata: () => ({
            fieldsMetadata: {},
            loading: false,
          }),
        },
      },
    },
    core: {
      docLinks: {
        links: {
          elasticsearch: {
            mappingParameters: 'https://example.invalid',
          },
        },
      },
    },
  }),
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-test-subj="mockCodeEditor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Setup userEvent with pointerEventsCheck disabled to avoid issues with EUI animation
const user = userEvent.setup({ pointerEventsCheck: 0 });

const createMockWiredStream = (name: string) =>
  ({
    name,
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
  } as unknown as Streams.ingest.all.Definition);

const createMockClassicStream = (name: string) =>
  ({
    name,
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
  } as unknown as Streams.ingest.all.Definition);

const renderFlyout = ({
  field,
  streamName = 'logs.test',
  onStage = jest.fn(),
  streamType = 'wired' as 'wired' | 'classic',
  isDescriptionOnlyMode = false,
}: {
  field: SchemaField;
  streamName?: string;
  onStage?: jest.Mock;
  streamType?: 'wired' | 'classic';
  isDescriptionOnlyMode?: boolean;
}) => {
  const stream =
    streamType === 'classic'
      ? createMockClassicStream(streamName)
      : createMockWiredStream(streamName);

  let unmountFlyout = () => {};
  const onClose = jest.fn(() => {
    unmountFlyout();
  });

  const renderResult = render(
    <IntlProvider>
      <SchemaEditorFlyout
        field={field}
        stream={stream}
        isEditingByDefault
        isDescriptionOnlyMode={isDescriptionOnlyMode}
        onClose={onClose}
        onStage={onStage}
      />
    </IntlProvider>
  );

  unmountFlyout = renderResult.unmount;

  return { onClose, onStage, stream };
};

describe('SchemaEditorFlyout (description-only restrictions)', () => {
  describe('wired streams', () => {
    it('allows only editing description for inherited fields, and disables staging until description changes', async () => {
      const inheritedField: SchemaField = {
        name: 'attributes.inherited_date',
        parent: 'logs',
        status: 'inherited',
        type: 'date',
        format: 'epoch_millis',
        description: 'original description',
      };

      const { onStage } = renderFlyout({ field: inheritedField });

      // Mapping controls should be read-only/hidden (no type selector, no format combo box)
      expect(screen.queryByTestId('streamsAppFieldFormTypeSelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('streamsAppSchemaEditorFieldFormFormat')).not.toBeInTheDocument();

      // Description should be editable
      const descriptionTextArea = screen.getByTestId('streamsAppFieldSummaryDescriptionTextArea');
      expect(descriptionTextArea).toBeInTheDocument();

      const stageButton = screen.getByTestId('streamsAppSchemaEditorFieldStageButton');
      expect(stageButton).toBeDisabled();

      await user.clear(descriptionTextArea);
      await user.type(descriptionTextArea, 'updated description');

      expect(stageButton).toBeEnabled();
      await user.click(stageButton);

      expect(onStage).toHaveBeenCalledTimes(1);
      expect(onStage).toHaveBeenCalledWith({
        ...inheritedField,
        description: 'updated description',
      });
    });

    it('allows only editing description for documentation-only fields (status: unmapped) when isDescriptionOnlyMode is true', async () => {
      // Doc-only fields from getDefinitionFields have status: 'unmapped' without a type property
      // When opened with isDescriptionOnlyMode, only description editing is allowed
      const documentationOnlyField: SchemaField = {
        name: 'attributes.documented_only',
        parent: 'logs.test',
        status: 'unmapped',
        description: 'original description',
      };

      const { onStage, stream } = renderFlyout({
        field: documentationOnlyField,
        isDescriptionOnlyMode: true,
      });

      // Mapping controls should be read-only/hidden (no type selector)
      expect(screen.queryByTestId('streamsAppFieldFormTypeSelect')).not.toBeInTheDocument();

      const descriptionTextArea = screen.getByTestId('streamsAppFieldSummaryDescriptionTextArea');
      await user.clear(descriptionTextArea);
      await user.type(descriptionTextArea, 'updated description');

      const stageButton = screen.getByTestId('streamsAppSchemaEditorFieldStageButton');
      expect(stageButton).toBeEnabled();
      await user.click(stageButton);

      expect(onStage).toHaveBeenCalledTimes(1);
      const stagedField = onStage.mock.calls[0][0] as SchemaField;

      expect(stagedField).toEqual({
        name: documentationOnlyField.name,
        parent: stream.name,
        status: 'unmapped',
        description: 'updated description',
      });
      expect(stagedField).not.toHaveProperty('format');
      expect(stagedField).not.toHaveProperty('additionalParameters');
    });

    it('hides type selector for doc-only fields when isDescriptionOnlyMode is true', async () => {
      // This tests the scenario where:
      // 1. User previously edited a field, set it as a doc-only override with just a description
      // 2. The field is stored as { status: 'unmapped', description: '...' } without a type
      // 3. When re-editing via "Edit description" action (isDescriptionOnlyMode: true),
      //    the type selector should be hidden
      const docOnlyFieldWithoutType: SchemaField = {
        name: 'attributes.documented_field',
        parent: 'logs.test',
        status: 'unmapped',
        description: 'A description for this field',
        // No type property - this is how doc-only overrides are stored
      };

      const { onStage, stream } = renderFlyout({
        field: docOnlyFieldWithoutType,
        isDescriptionOnlyMode: true,
      });

      // The type selector should NOT be shown (description-only mode)
      expect(screen.queryByTestId('streamsAppFieldFormTypeSelect')).not.toBeInTheDocument();

      // Description should be editable and show the existing description
      const descriptionTextArea = screen.getByTestId('streamsAppFieldSummaryDescriptionTextArea');
      expect(descriptionTextArea).toHaveValue('A description for this field');

      // Update description and stage
      await user.clear(descriptionTextArea);
      await user.type(descriptionTextArea, 'Updated description');

      const stageButton = screen.getByTestId('streamsAppSchemaEditorFieldStageButton');
      expect(stageButton).toBeEnabled();
      await user.click(stageButton);

      expect(onStage).toHaveBeenCalledTimes(1);
      const stagedField = onStage.mock.calls[0][0] as SchemaField;

      // The staged field should maintain the doc-only format
      expect(stagedField).toEqual({
        name: docOnlyFieldWithoutType.name,
        parent: stream.name,
        status: 'unmapped',
        description: 'Updated description',
      });
    });

    it('shows type selector for unmapped fields when isDescriptionOnlyMode is false (default)', async () => {
      // When opening via "Edit field" action (isDescriptionOnlyMode defaults to false),
      // the type selector should be visible so users can map the field
      const unmappedField: SchemaField = {
        name: 'attributes.unmapped_field',
        parent: 'logs.test',
        status: 'unmapped',
        // No description - this is a detected field from ES
      };

      renderFlyout({ field: unmappedField }); // isDescriptionOnlyMode defaults to false

      // Type selector should be visible for wired streams when mapping a field
      expect(screen.getByTestId('streamsAppFieldFormTypeSelect')).toBeInTheDocument();
    });

    it('allows staging description-only changes for unmapped fields without selecting a type', async () => {
      // When opening an unmapped field via "Edit field" action and the user
      // only adds a description without selecting a type, they should be able
      // to stage the changes as a doc-only override
      const unmappedField: SchemaField = {
        name: 'attributes.unmapped_field',
        parent: 'logs.test',
        status: 'unmapped',
        // No description, no type - this is a detected field from ES
      };

      const { onStage, stream } = renderFlyout({ field: unmappedField });

      // Type selector should be visible initially
      expect(screen.getByTestId('streamsAppFieldFormTypeSelect')).toBeInTheDocument();

      // Add a description without selecting a type
      const descriptionTextArea = screen.getByTestId('streamsAppFieldSummaryDescriptionTextArea');
      await user.type(descriptionTextArea, 'field documentation');

      // Stage button should be enabled because description was added (even without type)
      const stageButton = screen.getByTestId('streamsAppSchemaEditorFieldStageButton');
      expect(stageButton).toBeEnabled();
      await user.click(stageButton);

      // Verify the staged field has status 'unmapped' (doc-only override)
      expect(onStage).toHaveBeenCalledTimes(1);
      const stagedField = onStage.mock.calls[0][0] as SchemaField;
      expect(stagedField).toEqual({
        name: 'attributes.unmapped_field',
        parent: stream.name,
        status: 'unmapped',
        description: 'field documentation',
      });
      // Should NOT have a type property
      expect(stagedField).not.toHaveProperty('type');
    });

    it('keeps status as unmapped when only description is changed for unmapped fields', async () => {
      // When an unmapped field already has a description and the user edits it,
      // the status should remain 'unmapped'
      const unmappedFieldWithDescription: SchemaField = {
        name: 'attributes.documented_field',
        parent: 'logs.test',
        status: 'unmapped',
        description: 'existing description',
      };

      const { onStage, stream } = renderFlyout({ field: unmappedFieldWithDescription });

      // Update the description
      const descriptionTextArea = screen.getByTestId('streamsAppFieldSummaryDescriptionTextArea');
      await user.clear(descriptionTextArea);
      await user.type(descriptionTextArea, 'updated description');

      const stageButton = screen.getByTestId('streamsAppSchemaEditorFieldStageButton');
      expect(stageButton).toBeEnabled();
      await user.click(stageButton);

      // Verify the staged field maintains status 'unmapped'
      expect(onStage).toHaveBeenCalledTimes(1);
      const stagedField = onStage.mock.calls[0][0] as SchemaField;
      expect(stagedField).toEqual({
        name: 'attributes.documented_field',
        parent: stream.name,
        status: 'unmapped',
        description: 'updated description',
      });
    });
  });

  describe('classic streams', () => {
    it('does NOT allow description-only editing for unmapped fields - type selector must be shown', async () => {
      // Classic streams do not support description-only overrides.
      // Users must specify a type to add a description.
      const unmappedField: SchemaField = {
        name: 'attributes.dynamic_field',
        parent: 'logs-test-default',
        status: 'unmapped',
      };

      renderFlyout({ field: unmappedField, streamType: 'classic' });

      // Type selector should be visible for classic streams (unlike wired streams)
      expect(screen.getByTestId('streamsAppFieldFormTypeSelect')).toBeInTheDocument();
    });

    it('requires a type to be selected before staging changes with a description', async () => {
      const unmappedField: SchemaField = {
        name: 'attributes.dynamic_field',
        parent: 'logs-test-default',
        status: 'unmapped',
      };

      const { onStage, stream } = renderFlyout({ field: unmappedField, streamType: 'classic' });

      // Add a description
      const descriptionTextArea = screen.getByTestId('streamsAppFieldSummaryDescriptionTextArea');
      await user.type(descriptionTextArea, 'my field description');

      // Stage button should be disabled because no type is selected
      const stageButton = screen.getByTestId('streamsAppSchemaEditorFieldStageButton');
      expect(stageButton).toBeDisabled();

      // Select a type
      const typeSelect = screen.getByTestId('streamsAppFieldFormTypeSelect');
      await user.click(typeSelect);
      const keywordOption = screen.getByTestId('option-type-keyword');
      await user.click(keywordOption);

      // Stage button should now be enabled
      expect(stageButton).toBeEnabled();
      await user.click(stageButton);

      // Verify the staged field has both type and description
      expect(onStage).toHaveBeenCalledTimes(1);
      const stagedField = onStage.mock.calls[0][0] as SchemaField;
      expect(stagedField).toMatchObject({
        name: 'attributes.dynamic_field',
        parent: stream.name,
        status: 'mapped',
        type: 'keyword',
        description: 'my field description',
      });
    });
  });
});
