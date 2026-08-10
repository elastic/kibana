/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { customContentEmbeddableFactory } from './custom_content_embeddable';
import type { CustomContentApi } from './custom_content_embeddable';
import type { CustomContentEmbeddableState } from '../server';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../common/panel_context_attachment';

let capturedOnTemplateChange: ((t: string) => void) | undefined;

jest.mock('./components/custom_content_component', () => ({
  CustomContentComponent: (props: {
    prompt: string | undefined;
    esqlQuery: string | undefined;
    savedTemplate: string | undefined;
    generationVersion: number;
    onTemplateChange: (t: string) => void;
  }) => {
    capturedOnTemplateChange = props.onTemplateChange;
    return (
      <div
        data-test-subj="mockCustomContentComponent"
        data-prompt={props.prompt ?? ''}
        data-esql-query={props.esqlQuery ?? ''}
        data-saved-template={props.savedTemplate ?? ''}
        data-generation-version={props.generationVersion}
      />
    );
  },
}));

let capturedFlyoutProps:
  | {
      onSave: (esqlQuery: string | undefined, template: string | undefined) => void;
      onClose: () => void;
    }
  | undefined;

jest.mock('./components/edit_custom_content_flyout', () => ({
  EditCustomContentFlyout: (props: any) => {
    capturedFlyoutProps = props;
    return <div data-test-subj="mockEditCustomContentFlyout" />;
  },
}));

let mockAgentBuilder: unknown;

jest.mock('./services', () => ({
  getServices: () => ({ agentBuilder: mockAgentBuilder, core: { http: {} }, search: jest.fn() }),
}));

const baseState: CustomContentEmbeddableState = {
  prompt: 'Show KPI cards',
  esqlQuery: 'FROM logs | STATS count = COUNT(*)',
  template: '<div>static html</div>',
};

const buildEmbeddable = async (initialState: CustomContentEmbeddableState) => {
  const parentApiStub = {};
  const uuid = 'test-uuid';

  const embeddable = await customContentEmbeddableFactory.buildEmbeddable({
    initializeDrilldownsManager: jest.fn(),
    initialState,
    parentApi: parentApiStub,
    finalizeApi: (api) =>
      ({ ...api, uuid, parentApi: parentApiStub } as unknown as CustomContentApi),
    uuid,
  });

  return { embeddable };
};

describe('customContentEmbeddableFactory', () => {
  afterEach(() => {
    mockAgentBuilder = undefined;
  });

  describe('serializeState', () => {
    it('round-trips prompt and template from initial state', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      expect(embeddable.api.serializeState()).toEqual(baseState);
    });

    it('reflects updates applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const nextState: CustomContentEmbeddableState = {
        prompt: 'Show a status board',
        template: '<div>new</div>',
      };

      act(() => {
        embeddable.api.applySerializedState(nextState);
      });

      expect(embeddable.api.serializeState()).toEqual(nextState);
    });

    it('serializes template as undefined when not provided', async () => {
      const { embeddable } = await buildEmbeddable({ prompt: 'Test', template: undefined });
      expect(embeddable.api.serializeState().template).toBeUndefined();
    });

    it('reflects esqlQuery update applied via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      act(() => {
        embeddable.api.applySerializedState({
          ...baseState,
          esqlQuery: 'FROM metrics | STATS avg = AVG(value)',
        });
      });
      expect(embeddable.api.serializeState().esqlQuery).toBe(
        'FROM metrics | STATS avg = AVG(value)'
      );
    });
  });

  describe('anyStateChange$', () => {
    it('does not emit on initial subscribe', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it('emits when esqlQuery changes via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);

      act(() => {
        embeddable.api.applySerializedState({
          ...baseState,
          esqlQuery: 'FROM metrics | LIMIT 10',
        });
      });

      expect(listener).toHaveBeenCalled();
    });

    it('emits when prompt or template changes via applySerializedState', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);

      act(() => {
        embeddable.api.applySerializedState({ ...baseState, template: 'changed' });
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Component', () => {
    it('passes prompt, esqlQuery and savedTemplate to CustomContentComponent', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const el = screen.getByTestId('mockCustomContentComponent');
      expect(el).toHaveAttribute('data-prompt', 'Show KPI cards');
      expect(el).toHaveAttribute('data-esql-query', baseState.esqlQuery);
      expect(el).toHaveAttribute('data-saved-template', '<div>static html</div>');
    });
  });

  describe('template caching', () => {
    it('writes back template when onTemplateChange is called from the component', async () => {
      const { embeddable } = await buildEmbeddable({ prompt: 'Test', template: undefined });
      await act(async () => render(<embeddable.Component />));

      expect(embeddable.api.serializeState().template).toBeUndefined();

      act(() => {
        capturedOnTemplateChange!('<div>generated</div>');
      });

      expect(embeddable.api.serializeState().template).toBe('<div>generated</div>');
    });
  });

  describe('flyout integration', () => {
    beforeEach(() => {
      capturedFlyoutProps = undefined;
    });

    it('`onEdit` opens the flyout', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      expect(screen.queryByTestId('mockEditCustomContentFlyout')).toBeNull();

      await act(async () => embeddable.api.onEdit());
      await waitFor(() =>
        expect(screen.getByTestId('mockEditCustomContentFlyout')).toBeInTheDocument()
      );
    });

    it('`handleFlyoutSave` updates state and re-renders', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit());
      await waitFor(() =>
        expect(screen.getByTestId('mockEditCustomContentFlyout')).toBeInTheDocument()
      );

      await act(async () =>
        capturedFlyoutProps!.onSave('FROM metrics | LIMIT 10', '<div>new</div>')
      );

      const state = embeddable.api.serializeState();
      expect(state.esqlQuery).toBe('FROM metrics | LIMIT 10');
      expect(state.template).toBe('<div>new</div>');
    });

    it('closing the flyout via `onClose`', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      await act(async () => embeddable.api.onEdit());
      await waitFor(() =>
        expect(screen.getByTestId('mockEditCustomContentFlyout')).toBeInTheDocument()
      );

      await act(async () => capturedFlyoutProps!.onClose());
      await waitFor(() => expect(screen.queryByTestId('mockEditCustomContentFlyout')).toBeNull());
    });
  });

  describe('agent event subscription', () => {
    it('applies template update from RoundCompleteEvent attachment', async () => {
      const chatEvents$ = new Subject<any>();
      const activeConversation$ = new BehaviorSubject<{ id: string } | null>({ id: 'conv-1' });

      mockAgentBuilder = {
        events: {
          ui: { activeConversation$ },
          getChatEvents$: jest.fn(() => chatEvents$),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const roundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            input: {
              attachment_refs: [
                {
                  attachment_id: 'att-1',
                  version: 2,
                  operation: 'updated',
                  actor: ATTACHMENT_REF_ACTOR.agent,
                },
              ],
            },
          },
          attachments: [
            {
              id: 'att-1',
              type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
              current_version: 2,
              versions: [
                {
                  version: 2,
                  data: {
                    panel_template: '<p>agent result</p>',
                    embeddable_id: 'test-uuid',
                  },
                },
              ],
            },
          ],
        },
      };

      await act(async () => chatEvents$.next(roundCompleteEvent));

      expect(embeddable.api.serializeState().template).toBe('<p>agent result</p>');
    });

    it('ignores events for a different embeddable_id', async () => {
      const chatEvents$ = new Subject<any>();
      const activeConversation$ = new BehaviorSubject<{ id: string } | null>({ id: 'conv-1' });

      mockAgentBuilder = {
        events: {
          ui: { activeConversation$ },
          getChatEvents$: jest.fn(() => chatEvents$),
        },
      };

      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const roundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            input: {
              attachment_refs: [
                {
                  attachment_id: 'att-1',
                  version: 2,
                  operation: 'updated',
                  actor: ATTACHMENT_REF_ACTOR.agent,
                },
              ],
            },
          },
          attachments: [
            {
              id: 'att-1',
              type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
              current_version: 2,
              versions: [
                {
                  version: 2,
                  data: {
                    panel_template: '<p>other panel</p>',
                    embeddable_id: 'different-uuid',
                  },
                },
              ],
            },
          ],
        },
      };

      await act(async () => chatEvents$.next(roundCompleteEvent));

      expect(embeddable.api.serializeState().template).toBe('<div>static html</div>');
    });
  });
});
