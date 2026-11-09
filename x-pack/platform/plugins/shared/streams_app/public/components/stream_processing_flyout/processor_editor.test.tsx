/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import fixture from '../../services/component_catalogue/catalogue_snapshot/components_v1.json';
import { toComponentChecker } from '../../services/component_catalogue';
import { ProcessorEditor } from './processor_editor';

const mockOpenConfirm = jest.fn();
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ core: { overlays: { openConfirm: mockOpenConfirm } } }),
}));

const catalogue = fixture as ComponentCatalogue;

const savedStep = {
  key: 'step-0',
  status: 'saved' as const,
  processor: {
    id: 'add-fields-1',
    type: 'add_fields',
    supported_telemetry: ['logs' as const],
    config: [
      {
        name: 'fields',
        value: [{ action: 'delete', location: 'attributes', path: 'secret' }],
      },
    ],
  },
};

const VALID = { valid: true, diagnostics: [] };

/** `fetchCheck` stands in for the `_validate` round trip the checker wraps. */
const renderEditor = ({
  fetchCheck = jest.fn().mockResolvedValue(VALID),
  ...props
}: Partial<React.ComponentProps<typeof ProcessorEditor>> & { fetchCheck?: jest.Mock } = {}) => {
  const onCommit = jest.fn();
  const onCancel = jest.fn();
  render(
    <EuiProvider>
      <ProcessorEditor
        catalogue={catalogue}
        telemetry={['logs']}
        componentRefs={[]}
        checkComponent={toComponentChecker(fetchCheck)}
        componentIds={new Set(['add-fields-1'])}
        onCommit={onCommit}
        onCancel={onCancel}
        {...props}
      />
    </EuiProvider>
  );
  return { onCommit, onCancel, fetchCheck };
};

/** Sets the path combo box in two synchronous events; typing it re-renders per keystroke. */
const commitPath = (value: string) => {
  const input = screen.getByTestId('componentDefinitionFormPath-path').querySelector('input');
  if (!input) {
    throw new Error('Path combo box rendered without a search input');
  }
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

/** Fills the one `add_fields` operation the editor starts with. */
const fillOperation = () => {
  commitPath('team');
  fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
    target: { value: 'core' },
  });
};

const httpError = (status: number | undefined, message: string) =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    request: {},
    response: status === undefined ? undefined : { status },
    body: { message },
  });

beforeEach(() => {
  mockOpenConfirm.mockReset();
});

describe('ProcessorEditor', () => {
  it('preselects the only processor and commits its configuration', async () => {
    const { onCommit } = renderEditor();

    expect(screen.getByTestId('componentDefinitionForm-processor-add_fields')).toBeTruthy();
    commitPath('team');
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    await waitFor(() => expect(onCommit).toHaveBeenCalled());

    expect(onCommit).toHaveBeenCalledWith({
      type: 'add_fields',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'fields',
          value: [{ location: 'record', path: 'team', value: 'core', action: 'upsert' }],
        },
      ],
    });
  });

  it('shows client validation errors instead of committing an incomplete processor', async () => {
    const { onCommit } = renderEditor();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0);
  });

  it('edits an existing processor and keeps its id', async () => {
    const { onCommit } = renderEditor({ step: savedStep });

    expect(screen.queryByTestId('componentDefinitionFormLiteral-value')).toBeNull();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    await waitFor(() => expect(onCommit).toHaveBeenCalled());

    expect(onCommit).toHaveBeenCalledWith({
      id: 'add-fields-1',
      type: 'add_fields',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'fields',
          value: [{ location: 'attributes', path: 'secret', action: 'delete' }],
        },
      ],
    });
  });

  it('checks an existing processor only once it differs from what was opened', async () => {
    const { onCommit, fetchCheck } = renderEditor({ step: savedStep });

    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1));
    expect(fetchCheck).not.toHaveBeenCalled();

    commitPath('secret.token');
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(2));
    expect(fetchCheck).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: [
          {
            name: 'fields',
            value: [{ location: 'attributes', path: 'secret.token', action: 'delete' }],
          },
        ],
      })
    );
  });

  it('cancels an untouched editor without asking', async () => {
    const { onCommit, onCancel } = renderEditor();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCancel'));
    expect(mockOpenConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('asks before discarding edits', async () => {
    mockOpenConfirm.mockResolvedValue(false);
    const { onCancel } = renderEditor();
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCancel'));
    expect(mockOpenConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not offer delete while creating a processor', () => {
    renderEditor();
    expect(screen.queryByTestId('streamsProcessingFlyoutEditorDelete')).toBeNull();
  });

  it('does not warn about sharing for a processor only this slot applies', () => {
    renderEditor({ step: savedStep });
    expect(screen.queryByTestId('streamsProcessingFlyoutSharedProcessor')).toBeNull();
  });

  it('warns that edits to a shared processor apply everywhere it is used', () => {
    renderEditor({ step: savedStep, isShared: true });
    expect(screen.getByTestId('streamsProcessingFlyoutSharedProcessor')).toBeTruthy();
  });

  it('enables every supported signal for a new processor with fixed telemetry', async () => {
    const fixedCatalogue: ComponentCatalogue = {
      ...catalogue,
      components: catalogue.components.map((component) =>
        component.type === 'add_fields' ? { ...component, telemetry_selection: 'fixed' } : component
      ),
      definitions: catalogue.definitions.map((definition) =>
        definition.type === 'add_fields'
          ? { ...definition, telemetry_selection: 'fixed' }
          : definition
      ),
    };
    const { onCommit } = renderEditor({ catalogue: fixedCatalogue });
    commitPath('team');
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    await waitFor(() => expect(onCommit).toHaveBeenCalled());

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        supported_telemetry: ['logs', 'metrics', 'traces', 'docs', 'profiles'],
      })
    );
  });

  describe('choosing the signals a processor applies to', () => {
    const limitedCatalogue = (limit: number): ComponentCatalogue => ({
      ...catalogue,
      definitions: catalogue.definitions.map((definition) =>
        definition.type === 'add_fields'
          ? { ...definition, max_selected_telemetry: limit }
          : definition
      ),
    });

    it('applies a new processor to every flowing signal when there is no limit', () => {
      renderEditor({ telemetry: ['logs', 'metrics'] });

      expect(
        within(screen.getByTestId('streamsProcessingFlyoutEditorSignals')).getByText('logs')
      ).toBeTruthy();
      expect(
        within(screen.getByTestId('streamsProcessingFlyoutEditorSignals')).getByText('metrics')
      ).toBeTruthy();
    });

    it('narrows a new processor to the signals left after removing one', async () => {
      const { onCommit } = renderEditor({ telemetry: ['logs', 'metrics', 'traces'] });

      await userEvent.click(screen.getByLabelText('Remove metrics from selection in this group'));
      commitPath('team');
      fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
        target: { value: 'core' },
      });
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() => expect(onCommit).toHaveBeenCalled());

      expect(onCommit).toHaveBeenCalledWith(
        expect.objectContaining({ supported_telemetry: ['logs', 'traces'] })
      );
    });

    it('keeps offering the signals an existing processor enables after they are all removed', async () => {
      renderEditor({
        telemetry: ['logs'],
        step: {
          ...savedStep,
          processor: { ...savedStep.processor, supported_telemetry: ['logs', 'metrics'] },
        },
      });

      await userEvent.click(screen.getByLabelText('Remove logs from selection in this group'));
      await userEvent.click(screen.getByLabelText('Remove metrics from selection in this group'));

      expect(screen.getByText('Choose at least one signal')).toBeTruthy();
      expect(screen.getByTestId('streamsProcessingFlyoutEditorSubmit')).toBeDisabled();

      const picker = screen.getByTestId('streamsProcessingFlyoutEditorSignals');
      await userEvent.click(within(picker).getByRole('combobox'));
      await userEvent.click(screen.getByRole('option', { name: 'metrics' }));
      expect(within(picker).getByText('metrics')).toBeTruthy();
      expect(screen.queryByText('Choose at least one signal')).toBeNull();
    });

    it('offers item scopes only while the processor applies to more than one signal', async () => {
      renderEditor({ telemetry: ['logs', 'metrics'] });
      expect(screen.getByTestId('componentDefinitionFormItemTelemetry')).toBeTruthy();

      await userEvent.click(screen.getByLabelText('Remove logs from selection in this group'));
      expect(screen.queryByTestId('componentDefinitionFormItemTelemetry')).toBeNull();

      await userEvent.click(screen.getByLabelText('Remove metrics from selection in this group'));
      expect(screen.queryByTestId('componentDefinitionFormItemTelemetry')).toBeNull();
    });

    it('narrows item scopes with the processor and flags an item left with no signal', async () => {
      const item = { location: 'record', path: 'tier', action: 'upsert', value: 'gold' };
      const { onCommit } = renderEditor({
        telemetry: ['logs', 'metrics'],
        step: {
          ...savedStep,
          processor: {
            ...savedStep.processor,
            supported_telemetry: ['logs', 'metrics'],
            config: [
              {
                name: 'fields',
                value: [
                  { ...item, telemetry: ['logs', 'metrics'] },
                  { ...item, telemetry: ['metrics'] },
                ],
              },
            ],
          },
        },
      });

      await userEvent.click(
        within(screen.getByTestId('streamsProcessingFlyoutEditorSignals')).getByLabelText(
          'Remove metrics from selection in this group'
        )
      );

      expect(
        screen.getByText(
          'Applies to signals this processor no longer handles. Change it or remove the item.'
        )
      ).toBeTruthy();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
      expect(onCommit).not.toHaveBeenCalled();

      await userEvent.click(screen.getAllByTestId('componentDefinitionFormArrayRemove')[1]);
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() => expect(onCommit).toHaveBeenCalled());

      expect(onCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          supported_telemetry: ['logs'],
          config: [{ name: 'fields', value: [expect.objectContaining({ telemetry: ['logs'] })] }],
        })
      );
    });

    it('waits for a choice when more signals flow than the processor may apply to', async () => {
      const { onCommit } = renderEditor({
        catalogue: limitedCatalogue(1),
        telemetry: ['logs', 'metrics'],
      });
      expect(screen.getByTestId('streamsProcessingFlyoutEditorSubmit')).toBeDisabled();

      commitPath('team');
      fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
        target: { value: 'core' },
      });
      await userEvent.click(
        within(screen.getByTestId('streamsProcessingFlyoutEditorSignals')).getByTestId(
          'comboBoxSearchInput'
        )
      );
      await userEvent.click(screen.getByRole('option', { name: 'metrics' }));
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() => expect(onCommit).toHaveBeenCalled());

      expect(onCommit).toHaveBeenCalledWith(
        expect.objectContaining({ supported_telemetry: ['metrics'] })
      );
    });

    it('rejects an existing processor that applies to more signals than allowed', async () => {
      const { onCommit } = renderEditor({
        catalogue: limitedCatalogue(1),
        telemetry: ['logs', 'metrics'],
        step: {
          ...savedStep,
          processor: { ...savedStep.processor, supported_telemetry: ['logs', 'metrics'] },
        },
      });
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      expect(onCommit).not.toHaveBeenCalled();
      expect(screen.getByText('Choose at most 1 signal')).toBeTruthy();
    });

    it('lists the signals of a fixed processor instead of offering a choice', () => {
      renderEditor({
        catalogue: {
          ...catalogue,
          definitions: catalogue.definitions.map((definition) =>
            definition.type === 'add_fields'
              ? { ...definition, telemetry_selection: 'fixed' }
              : definition
          ),
        },
        telemetry: ['logs', 'metrics'],
      });

      expect(screen.queryByTestId('streamsProcessingFlyoutEditorSignals')).toBeNull();
      expect(screen.getByTestId('streamsProcessingFlyoutFixedSignals')).toBeTruthy();
    });
  });

  describe('checking the processor with the configuration service', () => {
    it('checks a new processor under the id it would get when saved', async () => {
      const { fetchCheck, onCommit } = renderEditor();
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() => expect(onCommit).toHaveBeenCalled());
      expect(fetchCheck).toHaveBeenCalledWith(
        {
          kind: 'processor',
          component: expect.objectContaining({ id: 'add-fields-2', type: 'add_fields' }),
        },
        expect.any(AbortSignal)
      );
      expect(onCommit.mock.calls[0][0].id).toBeUndefined();
    });

    it('disables the form while the check runs', async () => {
      renderEditor({ fetchCheck: jest.fn(() => new Promise(() => {})) });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      expect(screen.getByTestId('streamsProcessingFlyoutEditorSubmit')).toBeDisabled();
      expect(screen.getByTestId('componentDefinitionFormLiteral-value')).toBeDisabled();
    });

    it('keeps the editor open and lists what the service found wrong', async () => {
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockResolvedValue({
          valid: false,
          diagnostics: [
            {
              severity: 'error',
              code: 'E028_INVALID_CONFIG_TYPE',
              message: 'action must be one of upsert, update, insert, delete',
            },
          ],
        }),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');
      expect(within(callout).getByText('E028_INVALID_CONFIG_TYPE:')).toBeTruthy();
      expect(
        within(callout).getByText('action must be one of upsert, update, insert, delete')
      ).toBeTruthy();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it('shows warnings from a valid check and commits only once the user continues', async () => {
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockResolvedValue({
          valid: true,
          diagnostics: [{ severity: 'warning', code: 'W001', message: 'This field is deprecated' }],
        }),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorWarnings');
      expect(within(callout).getByText('W001:')).toBeTruthy();
      expect(within(callout).getByText('This field is deprecated')).toBeTruthy();
      expect(onCommit).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCommitAnyway'));
      expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'add_fields' }));
    });

    it('drops the warnings once the processor is edited again', async () => {
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockResolvedValue({
          valid: true,
          diagnostics: [{ severity: 'warning', code: 'W001', message: 'This field is deprecated' }],
        }),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
      await screen.findByTestId('streamsProcessingFlyoutEditorWarnings');

      fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
        target: { value: 'platform' },
      });
      expect(screen.queryByTestId('streamsProcessingFlyoutEditorWarnings')).toBeNull();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it('shows a diagnostic on the field its pointer names and clears it on edit', async () => {
      const message = 'action must be one of upsert, update, insert, delete';
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockResolvedValue({
          valid: false,
          diagnostics: [
            {
              severity: 'error',
              code: 'E028_INVALID_CONFIG_TYPE',
              message,
              path: '/config/0/value/0/action',
            },
          ],
        }),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');
      expect(within(callout).getByText('Fix the highlighted field above.')).toBeTruthy();
      expect(within(callout).queryByText(message)).toBeNull();
      expect(
        within(screen.getByTestId('componentDefinitionFormRow-action')).getByText(message)
      ).toBeTruthy();
      expect(onCommit).not.toHaveBeenCalled();

      fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
        target: { value: 'platform' },
      });
      expect(
        within(screen.getByTestId('componentDefinitionFormRow-action')).queryByText(message)
      ).toBeNull();
    });

    it('lists a diagnostic on a config entry the form has no field for', async () => {
      const message = 'unknown parameter legacy_option';
      renderEditor({
        step: {
          ...savedStep,
          processor: {
            ...savedStep.processor,
            config: [...savedStep.processor.config, { name: 'legacy_option', value: true }],
          },
        },
        fetchCheck: jest.fn().mockResolvedValue({
          valid: false,
          diagnostics: [
            { severity: 'error', code: 'E029_UNKNOWN_CONFIG', message, path: '/config/1' },
          ],
        }),
      });
      commitPath('other');
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');
      expect(within(callout).getByText(message)).toBeTruthy();
      expect(within(callout).queryByText(/highlighted field/)).toBeNull();
    });

    it('commits unchecked when the configuration service cannot be reached', async () => {
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockRejectedValue(httpError(502, 'Bad Gateway')),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() =>
        expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'add_fields' }), {
          unchecked: true,
        })
      );
    });

    it('shows any other failure in the editor instead of committing', async () => {
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockRejectedValue(httpError(403, 'Missing privileges')),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorCheckFailed');
      expect(within(callout).getByText('Missing privileges')).toBeTruthy();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it('stops the check on Cancel, so a check finishing behind the prompt commits nothing', async () => {
      let finishCheck: (value: typeof VALID) => void = () => {};
      let checkSignal: AbortSignal | undefined;
      mockOpenConfirm.mockResolvedValue(false);
      const { onCommit, onCancel } = renderEditor({
        fetchCheck: jest.fn(
          (_request, signal?: AbortSignal) =>
            new Promise((resolve) => {
              checkSignal = signal;
              finishCheck = resolve;
            })
        ),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCancel'));

      expect(checkSignal?.aborted).toBe(true);
      finishCheck(VALID);
      await waitFor(() => expect(mockOpenConfirm).toHaveBeenCalled());
      expect(onCommit).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByTestId('streamsProcessingFlyoutEditorSubmit')).toBeEnabled();
    });
  });

  it('deletes an existing processor once confirmed', async () => {
    mockOpenConfirm.mockResolvedValue(true);
    const onDelete = jest.fn();
    renderEditor({ step: savedStep, onDelete });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorDelete'));
    expect(mockOpenConfirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
