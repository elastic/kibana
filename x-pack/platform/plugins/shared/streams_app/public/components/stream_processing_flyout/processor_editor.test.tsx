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
import { toComponentChecker } from '../../services/component_catalogue';
import {
  definitionOf,
  singleProcessorCatalogue,
  testCatalogue,
  withDefinition,
  withItemTelemetry,
} from '../component_definition_form/test_helpers';
import { ProcessorEditor } from './processor_editor';

const mockOpenConfirm = jest.fn();
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ core: { overlays: { openConfirm: mockOpenConfirm } } }),
}));

// With one processor on offer the editor preselects it, so most cases start in its form.
const catalogue = singleProcessorCatalogue('set');
const setDefinition = definitionOf('set');

const savedStep = {
  key: 'step-0',
  status: 'saved' as const,
  processor: {
    id: 'set-1',
    type: 'set',
    supported_telemetry: ['logs' as const],
    config: [
      {
        name: 'operations',
        value: [{ action: 'update', location: 'attributes', path: 'secret', value: 'x' }],
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
        componentIds={new Set(['set-1'])}
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

/** Removes a signal pill in one synchronous event; `userEvent` rechecks the editor tree per click. */
const removeSignal = (signal: string, picker?: HTMLElement) =>
  fireEvent.click(
    (picker ? within(picker) : screen).getByLabelText(
      `Remove ${signal} from selection in this group`
    )
  );

/** Opens a signals combo box and picks one of its options, in two synchronous events. */
const pickSignal = (signal: string, picker: HTMLElement) => {
  fireEvent.focusIn(within(picker).getByTestId('comboBoxSearchInput'));
  fireEvent.click(screen.getByRole('option', { name: signal }));
};

/** Fills the one `set` operation the editor starts with. */
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

// Every case mounts the whole editor, a cost that parallel CI load pushes past the default 5s.
jest.setTimeout(30_000);

const fixedCatalogue = withDefinition(catalogue, {
  ...setDefinition,
  telemetry_selection: 'fixed',
});

describe('ProcessorEditor', () => {
  it('waits for a processor to be chosen when the catalogue offers several', () => {
    renderEditor({ catalogue: testCatalogue });

    expect(screen.queryByTestId(/^componentDefinitionForm-processor-/)).toBeNull();
    expect(screen.getByTestId('streamsProcessingFlyoutEditorSubmit')).toBeDisabled();
  });

  it('preselects the only processor and commits its configuration', async () => {
    const { onCommit } = renderEditor();

    expect(screen.getByTestId('componentDefinitionForm-processor-set')).toBeTruthy();
    commitPath('team');
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    await waitFor(() => expect(onCommit).toHaveBeenCalled());

    expect(onCommit).toHaveBeenCalledWith({
      type: 'set',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'operations',
          value: [{ location: 'record', path: 'team', value: 'core', action: 'upsert' }],
        },
      ],
    });
  });

  it('labels the status badge from the catalogue and explains it on hover', async () => {
    renderEditor();

    const badge = screen.getByTestId('streamsProcessingFlyoutStatusBadge');
    expect(badge.textContent).toBe('Experimental');
    await userEvent.hover(badge);
    expect(await screen.findByText(/New and still evolving/)).toBeTruthy();
  });

  it('falls back to the status value when the catalogue does not describe statuses', () => {
    const { 'component.statuses': statuses, ...enumSets } = catalogue.metadata.enum_sets;
    renderEditor({
      catalogue: { ...catalogue, metadata: { ...catalogue.metadata, enum_sets: enumSets } },
    });

    expect(screen.getByTestId('streamsProcessingFlyoutStatusBadge').textContent).toBe(
      'experimental'
    );
  });

  describe('the help of a processor', () => {
    const withHelp = (help: NonNullable<typeof setDefinition.help>) =>
      withDefinition(catalogue, { ...setDefinition, help });

    it('shows only the summary when the catalogue sends nothing more', () => {
      renderEditor();

      expect(screen.getByText(setDefinition.help?.summary ?? '')).toBeTruthy();
      expect(screen.queryByTestId('streamsProcessingFlyoutProcessorHelpDetails')).toBeNull();
      expect(screen.queryByTestId('streamsProcessingFlyoutProcessorHelpLink')).toBeNull();
    });

    it('shows the details under the summary and links to the documentation', () => {
      renderEditor({
        catalogue: withHelp({
          summary: 'Sets fields.',
          details: 'Each operation writes one field.',
          documentation: 'https://www.elastic.co/docs/set',
        }),
      });

      expect(screen.getByText('Sets fields.')).toBeTruthy();
      expect(screen.getByTestId('streamsProcessingFlyoutProcessorHelpDetails').textContent).toBe(
        'Each operation writes one field.'
      );
      const link = screen.getByTestId('streamsProcessingFlyoutProcessorHelpLink');
      expect(link.getAttribute('href')).toBe('https://www.elastic.co/docs/set');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });

    // Put together here, as the linter takes a script URL written out for one in use.
    const scriptUrl = ['javascript', 'alert(1)'].join(':');

    it.each([scriptUrl, 'data:text/html,hello', 'ftp://example.com/set', '/docs/set', 'not a url'])(
      'does not link to %s',
      (documentation) => {
        renderEditor({ catalogue: withHelp({ summary: 'Sets fields.', documentation }) });

        expect(screen.getByText('Sets fields.')).toBeTruthy();
        expect(screen.queryByTestId('streamsProcessingFlyoutProcessorHelpLink')).toBeNull();
      }
    );
  });

  it('shows client validation errors instead of committing an incomplete processor', async () => {
    const { onCommit } = renderEditor();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0);
  });

  it('edits an existing processor and keeps its id', async () => {
    const { onCommit } = renderEditor({ step: savedStep });

    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    await waitFor(() => expect(onCommit).toHaveBeenCalled());

    expect(onCommit).toHaveBeenCalledWith({
      id: 'set-1',
      type: 'set',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'operations',
          value: [{ location: 'attributes', path: 'secret', value: 'x', action: 'update' }],
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
            name: 'operations',
            value: [{ location: 'attributes', path: 'secret.token', value: 'x', action: 'update' }],
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
    const limitedCatalogue = (limit: number): ComponentCatalogue =>
      withDefinition(catalogue, { ...setDefinition, max_selected_telemetry: limit });
    // No processor of the catalogue lets its items choose their signals, though the schema does.
    const scopedItemsCatalogue = withDefinition(catalogue, withItemTelemetry(setDefinition));

    it('applies a new processor to every flowing signal when there is no limit', () => {
      renderEditor({ telemetry: ['logs', 'metrics'] });

      expect(
        within(screen.getByTestId('streamsProcessingFlyoutEditorSignals')).getByText('Logs')
      ).toBeTruthy();
      expect(
        within(screen.getByTestId('streamsProcessingFlyoutEditorSignals')).getByText('Metrics')
      ).toBeTruthy();
    });

    it('narrows a new processor to the signals left after removing one', async () => {
      const { onCommit } = renderEditor({ telemetry: ['logs', 'metrics', 'traces'] });

      removeSignal('Metrics');
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

    it('keeps offering the signals an existing processor enables after they are all removed', () => {
      renderEditor({
        telemetry: ['logs'],
        step: {
          ...savedStep,
          processor: { ...savedStep.processor, supported_telemetry: ['logs', 'metrics'] },
        },
      });

      removeSignal('Logs');
      removeSignal('Metrics');

      expect(screen.getByText('Choose at least one signal')).toBeTruthy();
      expect(screen.getByTestId('streamsProcessingFlyoutEditorSubmit')).toBeDisabled();

      const picker = screen.getByTestId('streamsProcessingFlyoutEditorSignals');
      pickSignal('Metrics', picker);
      expect(within(picker).getByText('Metrics')).toBeTruthy();
      expect(screen.queryByText('Choose at least one signal')).toBeNull();
    });

    it('offers item scopes only while the processor applies to more than one signal', () => {
      renderEditor({ catalogue: scopedItemsCatalogue, telemetry: ['logs', 'metrics'] });
      expect(screen.getByTestId('componentDefinitionFormItemTelemetry')).toBeTruthy();

      removeSignal('Logs');
      expect(screen.queryByTestId('componentDefinitionFormItemTelemetry')).toBeNull();

      removeSignal('Metrics');
      expect(screen.queryByTestId('componentDefinitionFormItemTelemetry')).toBeNull();
    });

    it('narrows item scopes with the processor and flags an item left with no signal', async () => {
      const item = { location: 'record', path: 'tier', action: 'upsert', value: 'gold' };
      const { onCommit } = renderEditor({
        catalogue: scopedItemsCatalogue,
        telemetry: ['logs', 'metrics'],
        step: {
          ...savedStep,
          processor: {
            ...savedStep.processor,
            supported_telemetry: ['logs', 'metrics'],
            config: [
              {
                name: 'operations',
                value: [
                  { ...item, telemetry: ['logs', 'metrics'] },
                  { ...item, telemetry: ['metrics'] },
                ],
              },
            ],
          },
        },
      });

      removeSignal('Metrics', screen.getByTestId('streamsProcessingFlyoutEditorSignals'));

      expect(
        screen.getByText(
          'Applies to signals this processor no longer handles. Change it or remove the item.'
        )
      ).toBeTruthy();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
      expect(onCommit).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByTestId('componentDefinitionFormArrayRemove')[1]);
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() => expect(onCommit).toHaveBeenCalled());

      expect(onCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          supported_telemetry: ['logs'],
          config: [
            { name: 'operations', value: [expect.objectContaining({ telemetry: ['logs'] })] },
          ],
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
      pickSignal('Metrics', screen.getByTestId('streamsProcessingFlyoutEditorSignals'));
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
        catalogue: fixedCatalogue,
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
          component: expect.objectContaining({ id: 'set-2', type: 'set' }),
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
              message: 'action must be one of upsert, update, insert',
            },
          ],
        }),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');
      expect(within(callout).getByText('E028_INVALID_CONFIG_TYPE:')).toBeTruthy();
      expect(
        within(callout).getByText('action must be one of upsert, update, insert')
      ).toBeTruthy();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it('lists the details a diagnostic came with under its message', async () => {
      renderEditor({
        fetchCheck: jest.fn().mockResolvedValue({
          valid: false,
          diagnostics: [
            {
              severity: 'error',
              code: 'E028_INVALID_CONFIG_TYPE',
              message: 'action is not one of the allowed values',
              details: { got: 'delete', allowed: ['upsert', 'update', 'insert'] },
            },
            { severity: 'error', code: 'E030', message: 'no details here' },
          ],
        }),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');
      const details = within(callout).getAllByTestId(
        'streamsProcessingFlyoutEditorDiagnosticDetails'
      );
      expect(details).toHaveLength(1);
      expect(
        within(details[0])
          .getAllByRole('listitem')
          .map((item) => item.textContent)
      ).toEqual(['got: delete', 'allowed: ["upsert","update","insert"]']);
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
      expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'set' }));
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
      const message = 'action must be one of upsert, update, insert';
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

    it('drops the rejection once the user switches to another processor', async () => {
      renderEditor({
        catalogue: testCatalogue,
        fetchCheck: jest.fn().mockResolvedValue({
          valid: false,
          diagnostics: [
            {
              severity: 'error',
              code: 'E028_INVALID_CONFIG_TYPE',
              message: 'action must be one of upsert, update, insert',
              path: '/config/0/value/0/action',
            },
          ],
        }),
      });
      const selectProcessor = async (name: RegExp) => {
        await userEvent.click(
          within(screen.getByTestId('streamsProcessingFlyoutProcessorType')).getByTestId(
            'comboBoxSearchInput'
          )
        );
        // The option's name also carries its status badge.
        await userEvent.click(await screen.findByRole('option', { name }));
      };
      await selectProcessor(/^Set/);
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
      await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');

      await selectProcessor(/^Add fields/);

      expect(screen.queryByTestId('streamsProcessingFlyoutEditorDiagnostics')).toBeNull();
      expect(screen.getByText('ADD FIELDS')).toBeTruthy();
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

    it('keeps what no field could show while the form is edited', async () => {
      const message = 'unknown parameter legacy_option';
      const fieldMessage = 'action must be one of upsert, update, insert';
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
            {
              severity: 'error',
              code: 'E028_INVALID_CONFIG_TYPE',
              message: fieldMessage,
              path: '/config/0/value/0/action',
            },
          ],
        }),
      });
      commitPath('other');
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));
      const callout = await screen.findByTestId('streamsProcessingFlyoutEditorDiagnostics');
      expect(within(callout).getByText('Fix the highlighted field above.')).toBeTruthy();

      fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
        target: { value: 'platform' },
      });

      const kept = screen.getByTestId('streamsProcessingFlyoutEditorDiagnostics');
      expect(within(kept).getByText(message)).toBeTruthy();
      // The edit took the error off the field, so there is no highlighted field to point at.
      expect(within(kept).queryByText(/highlighted field/)).toBeNull();
      expect(screen.queryByText(fieldMessage)).toBeNull();
    });

    it('commits unchecked when the configuration service cannot be reached', async () => {
      const { onCommit } = renderEditor({
        fetchCheck: jest.fn().mockRejectedValue(httpError(502, 'Bad Gateway')),
      });
      await fillOperation();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

      await waitFor(() =>
        expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'set' }), {
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
