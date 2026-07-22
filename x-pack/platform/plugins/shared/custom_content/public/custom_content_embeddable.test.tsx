/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { customContentEmbeddableFactory } from './custom_content_embeddable';
import type { CustomContentApi } from './custom_content_embeddable';
import type { CustomContentEmbeddableState } from '../server';

let capturedOnTemplateChange: ((t: string) => void) | undefined;

jest.mock('./components/custom_content_component', () => ({
  CustomContentComponent: (props: {
    prompt: string | undefined;
    savedTemplate: string | undefined;
    generationVersion: number;
    onTemplateChange: (t: string) => void;
  }) => {
    capturedOnTemplateChange = props.onTemplateChange;
    return (
      <div
        data-test-subj="mockCustomContentComponent"
        data-prompt={props.prompt ?? ''}
        data-saved-template={props.savedTemplate ?? ''}
        data-generation-version={props.generationVersion}
      />
    );
  },
}));

const baseState: CustomContentEmbeddableState = {
  prompt: 'Show KPI cards',
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
  });

  describe('anyStateChange$', () => {
    it('does not emit on initial subscribe', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      const listener = jest.fn();
      embeddable.api.anyStateChange$.subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
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
    it('passes prompt and savedTemplate to CustomContentComponent', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      const el = screen.getByTestId('mockCustomContentComponent');
      expect(el).toHaveAttribute('data-prompt', 'Show KPI cards');
      expect(el).toHaveAttribute('data-saved-template', '<div>static html</div>');
    });

    it('starts with generationVersion 0', async () => {
      const { embeddable } = await buildEmbeddable(baseState);
      await act(async () => render(<embeddable.Component />));

      expect(screen.getByTestId('mockCustomContentComponent')).toHaveAttribute(
        'data-generation-version',
        '0'
      );
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
});
