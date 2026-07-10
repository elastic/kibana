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
    esqlQuery: string | undefined;
    onSave: (esqlQuery: string | undefined, template: string | undefined) => void;
    onAgentUpdate: (update: { prompt?: string; esqlQuery?: string }) => void;
  }) => (
    <div data-test-subj="mockEditFlyout">
      <button
        data-test-subj="saveTemplateEdit"
        onClick={() => props.onSave(props.esqlQuery, 'edited-template')}
      >
        save-template-edit
      </button>
      <button
        data-test-subj="saveChangedQuery"
        onClick={() => props.onSave('FROM a-different-index', 'edited-template')}
      >
        save-changed-query
      </button>
      <button
        data-test-subj="agentUpdatePrompt"
        onClick={() => props.onAgentUpdate({ prompt: 'a new prompt' })}
      >
        agent-update-prompt
      </button>
      <button
        data-test-subj="agentUpdateQuery"
        onClick={() => props.onAgentUpdate({ esqlQuery: 'FROM agent-chosen-index' })}
      >
        agent-update-query
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

  const openEditFlyout = async (embeddable: { api: AiPanelApi }) => {
    await act(async () => {
      await embeddable.api.onEdit();
    });
    await waitFor(() => expect(screen.getByTestId('mockEditFlyout')).toBeInTheDocument());
  };

  describe('edit flyout onSave (manual query/template edits)', () => {
    it('keeps the edited template when only the template itself changes (query unchanged)', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await openEditFlyout(embeddable);

      await userEvent.click(screen.getByTestId('saveTemplateEdit'));

      expect(embeddable.api.serializeState()).toEqual({
        ...baseState,
        template: 'edited-template',
      });
    });

    it('clears the saved template when the query changes', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await openEditFlyout(embeddable);

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

      await openEditFlyout(embeddable);
      await userEvent.click(screen.getByTestId('saveTemplateEdit'));

      await waitFor(() =>
        expect(screen.getByTestId('mockAiPanelComponent')).toHaveAttribute(
          'data-generation-version',
          '1'
        )
      );
    });
  });

  describe('onAgentUpdate (agent tool call from the refine chat)', () => {
    it('clears the saved template when the agent changes the prompt', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await openEditFlyout(embeddable);

      await userEvent.click(screen.getByTestId('agentUpdatePrompt'));

      expect(embeddable.api.serializeState()).toEqual({
        ...baseState,
        prompt: 'a new prompt',
        template: undefined,
      });
    });

    it('clears the saved template when the agent changes the query', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await openEditFlyout(embeddable);

      await userEvent.click(screen.getByTestId('agentUpdateQuery'));

      expect(embeddable.api.serializeState()).toEqual({
        ...baseState,
        esqlQuery: 'FROM agent-chosen-index',
        template: undefined,
      });
    });

    it('bumps the generation version so the panel re-renders', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));
      await openEditFlyout(embeddable);

      await userEvent.click(screen.getByTestId('agentUpdatePrompt'));

      await waitFor(() =>
        expect(screen.getByTestId('mockAiPanelComponent')).toHaveAttribute(
          'data-generation-version',
          '1'
        )
      );
    });
  });
});
