/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aiPanelEmbeddableFactory } from './ai_panel_embeddable';
import type { AiPanelApi } from './ai_panel_embeddable';
import type { AiPanelEmbeddableState } from '../server';

jest.mock('./components/ai_panel_component', () => ({
  AiPanelComponent: (props: {
    prompt: string;
    esqlQuery: string | undefined;
    savedTemplate: string | undefined;
    generationVersion: number;
  }) => (
    <div
      data-test-subj="mockAiPanelComponent"
      data-prompt={props.prompt}
      data-esql-query={props.esqlQuery ?? ''}
      data-saved-template={props.savedTemplate ?? ''}
      data-generation-version={props.generationVersion}
    />
  ),
}));

jest.mock('./components/edit_ai_panel_flyout', () => ({
  EditAiPanelFlyout: (props: {
    prompt: string;
    esqlQuery: string | undefined;
    onSave: (prompt: string, esqlQuery: string | undefined, template: string | undefined) => void;
  }) => (
    <div data-test-subj="mockEditFlyout">
      <button
        data-test-subj="saveSamePrompt"
        onClick={() => props.onSave(props.prompt, props.esqlQuery, 'edited-template')}
      >
        save-same-prompt
      </button>
      <button
        data-test-subj="saveChangedPrompt"
        onClick={() => props.onSave('a new prompt', props.esqlQuery, 'edited-template')}
      >
        save-changed-prompt
      </button>
      <button
        data-test-subj="saveChangedQuery"
        onClick={() => props.onSave(props.prompt, 'FROM a-different-index', 'edited-template')}
      >
        save-changed-query
      </button>
    </div>
  ),
}));

const baseState: AiPanelEmbeddableState = {
  prompt: 'Show KPI cards',
  esqlQuery: 'FROM logs | STATS count()',
  template: '<div>{{row.count}}</div>',
};

const buildEmbeddable = async (initialState: AiPanelEmbeddableState) => {
  const parentApiStub = {};
  const uuid = 'test-uuid';

  const embeddable = await aiPanelEmbeddableFactory.buildEmbeddable({
    initializeDrilldownsManager: jest.fn(),
    initialState,
    parentApi: parentApiStub,
    finalizeApi: (api) => ({ ...api, uuid, parentApi: parentApiStub } as unknown as AiPanelApi),
    uuid,
  });

  return { embeddable };
};

describe('aiPanelEmbeddableFactory', () => {
  describe('serializeState', () => {
    it('round-trips prompt, esqlQuery and template from initial state', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      expect(embeddable.api.serializeState()).toEqual(baseState);
    });

    it('reflects updates applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const nextState: AiPanelEmbeddableState = {
        prompt: 'Show a status board',
        esqlQuery: 'FROM other',
        template: '<div>new</div>',
      };

      act(() => {
        embeddable.api.applySerializedState(nextState);
      });

      expect(embeddable.api.serializeState()).toEqual(nextState);
    });
  });

  describe('anyStateChange$', () => {
    it('does not emit on initial subscribe', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it('emits when prompt, esqlQuery or template change', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);

      act(() => {
        embeddable.api.applySerializedState({ ...baseState, template: 'changed' });
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('edit flyout onSave', () => {
    it('clears the saved template when the prompt changes, even if a new template was also provided', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => {
        await embeddable.api.onEdit();
      });
      await waitFor(() => expect(screen.getByTestId('mockEditFlyout')).toBeInTheDocument());

      await userEvent.click(screen.getByTestId('saveChangedPrompt'));

      expect(embeddable.api.serializeState()).toEqual({
        ...baseState,
        prompt: 'a new prompt',
        template: undefined,
      });
    });

    it('keeps the edited template when only the template itself changes (prompt and query unchanged)', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => {
        await embeddable.api.onEdit();
      });
      await waitFor(() => expect(screen.getByTestId('mockEditFlyout')).toBeInTheDocument());

      await userEvent.click(screen.getByTestId('saveSamePrompt'));

      expect(embeddable.api.serializeState()).toEqual({
        ...baseState,
        template: 'edited-template',
      });
    });

    it('clears the saved template when the query changes, even though the prompt is unchanged', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => {
        await embeddable.api.onEdit();
      });
      await waitFor(() => expect(screen.getByTestId('mockEditFlyout')).toBeInTheDocument());

      await userEvent.click(screen.getByTestId('saveChangedQuery'));

      expect(embeddable.api.serializeState()).toEqual({
        ...baseState,
        esqlQuery: 'FROM a-different-index',
        template: undefined,
      });
    });

    it('bumps the generation version on save so the panel re-renders', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      expect(screen.getByTestId('mockAiPanelComponent')).toHaveAttribute(
        'data-generation-version',
        '0'
      );

      await act(async () => {
        await embeddable.api.onEdit();
      });
      await waitFor(() => expect(screen.getByTestId('mockEditFlyout')).toBeInTheDocument());

      await userEvent.click(screen.getByTestId('saveSamePrompt'));

      await waitFor(() =>
        expect(screen.getByTestId('mockAiPanelComponent')).toHaveAttribute(
          'data-generation-version',
          '1'
        )
      );
    });
  });
});
