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

jest.mock('../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: () => '#',
  }),
}));

jest.mock('../../../../hooks/use_kibana', () => ({
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

const renderFlyout = ({
  field,
  streamName = 'logs.test',
  onStage = jest.fn(),
}: {
  field: SchemaField;
  streamName?: string;
  onStage?: jest.Mock;
}) => {
  const stream = createMockWiredStream(streamName);

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
        onClose={onClose}
        onStage={onStage}
      />
    </IntlProvider>
  );

  unmountFlyout = renderResult.unmount;

  return { onClose, onStage, stream };
};

describe('SchemaEditorFlyout (description-only restrictions)', () => {
  it('allows only editing description for inherited fields, and disables staging until description changes', async () => {
    const inheritedField: SchemaField = {
      name: 'attributes.inherited_date',
      parent: 'logs',
      status: 'inherited',
      type: 'date',
      format: 'epoch_millis',
      description: 'original description',
    };

    const { onStage, stream } = renderFlyout({ field: inheritedField });

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
      parent: stream.name,
      status: 'unmapped',
    });
  });

  it('allows only editing description for documentation-only fields (type: unmapped) and stages a minimal payload', async () => {
    const documentationOnlyField = {
      name: 'attributes.documented_only',
      parent: 'logs.test',
      status: 'mapped',
      type: 'unmapped',
      description: 'original description',
      // Extra properties should not leak into the staged payload in description-only mode
      format: 'epoch_millis',
      additionalParameters: { ignore_above: 256 },
    } as unknown as SchemaField;

    const { onStage, stream } = renderFlyout({ field: documentationOnlyField });

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
});
