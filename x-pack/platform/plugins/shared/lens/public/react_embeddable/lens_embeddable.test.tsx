/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { mockInitializeDrilldownsManager } from '@kbn/embeddable-plugin/public/mocks';
import type { PhaseEvent } from '@kbn/presentation-publishing';
import { getDescription, getTitle } from '@kbn/presentation-publishing';
import type { LensApi, LensWireAPIConfig } from '@kbn/lens-common-2';
import { createLensEmbeddableFactory } from './lens_embeddable';
import { createEmptyLensState } from './helper';
import { makeEmbeddableServices } from './mocks';

jest.mock('./data_loader', () => ({
  loadEmbeddableData: () => ({ cleanup: jest.fn() }),
}));

const buildPanel = async (
  initialState: LensWireAPIConfig,
  services = makeEmbeddableServices()
): Promise<LensApi> => {
  const { api } = await createLensEmbeddableFactory(services).buildEmbeddable({
    initialState,
    uuid: 'lens-panel',
    parentApi: undefined,
    initializeDrilldownsManager: mockInitializeDrilldownsManager,
    finalizeApi: (registration) => ({
      ...registration,
      uuid: 'lens-panel',
      type: 'lens',
      phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
    }),
  });
  return api;
};

describe('Lens embeddable applySerializedState', () => {
  it.each([{ title: '' }, { hide_title: true }])(
    'clears an obsolete default title after removing %j',
    async (initialTitles) => {
      const initial = { ...createEmptyLensState('lnsMetric', 'Metric'), ...initialTitles };
      const next = createEmptyLensState('lnsMetric', '');
      const panel = await buildPanel(initial);
      const freshPanel = await buildPanel(next);

      await panel.applySerializedState(next);

      expect(panel.serializeState()).toEqual(freshPanel.serializeState());
      expect(getTitle(panel)).toBe('');
      expect(getTitle(panel)).toBe(getTitle(freshPanel));
      expect(panel.hideTitle$?.getValue()).toBeUndefined();
    }
  );

  it('clears a removed by-value description without falling back to document attributes', async () => {
    const initial = { ...createEmptyLensState('lnsMetric', 'Metric'), description: 'Old text' };
    const next = createEmptyLensState('lnsMetric', 'Metric', 'Document description');
    const panel = await buildPanel(initial);
    const freshPanel = await buildPanel(next);

    await panel.applySerializedState(next);

    expect(panel.serializeState()).toEqual(freshPanel.serializeState());
    expect(getDescription(panel)).toBeUndefined();
    expect(getDescription(panel)).toBe(getDescription(freshPanel));
  });

  it('refreshes library defaults after the referenced document changes', async () => {
    const services = makeEmbeddableServices();
    services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
      attributes: createEmptyLensState('lnsMetric', 'Old title', 'Old description').attributes,
    });
    const panel = await buildPanel({ ref_id: 'same-id' }, services);
    services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
      attributes: createEmptyLensState('lnsMetric', 'New title', 'New description').attributes,
    });

    await panel.applySerializedState({ ref_id: 'same-id' });
    const freshPanel = await buildPanel({ ref_id: 'same-id' }, services);

    expect(getTitle(panel)).toBe('New title');
    expect(getDescription(panel)).toBe('New description');
    expect(getTitle(panel)).toBe(getTitle(freshPanel));
    expect(getDescription(panel)).toBe(getDescription(freshPanel));
  });

  it('preserves explicit empty overrides and hidden titles', async () => {
    const panel = await buildPanel(createEmptyLensState('lnsMetric', 'Metric'));
    const next = {
      ...createEmptyLensState('lnsMetric', 'New title'),
      title: '',
      description: '',
      hide_title: true,
    };

    await panel.applySerializedState(next);

    expect(getTitle(panel)).toBe('');
    expect(getDescription(panel)).toBe('');
    expect(panel.hideTitle$?.getValue()).toBe(true);
    panel.setTitle(undefined);
    expect(getTitle(panel)).toBe('New title');
  });

  it('keeps custom panel overrides separate from updated library defaults', async () => {
    const services = makeEmbeddableServices();
    services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
      attributes: createEmptyLensState('lnsMetric', 'Old title', 'Old description').attributes,
    });
    const panelState = {
      ref_id: 'same-id',
      title: 'Custom title',
      description: 'Custom description',
    };
    const panel = await buildPanel(panelState, services);
    services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
      attributes: createEmptyLensState('lnsMetric', 'New title', 'New description').attributes,
    });

    await panel.applySerializedState(panelState);

    expect(getTitle(panel)).toBe('Custom title');
    expect(getDescription(panel)).toBe('Custom description');
    panel.setTitle(undefined);
    panel.setDescription(undefined);
    expect(getTitle(panel)).toBe('New title');
    expect(getDescription(panel)).toBe('New description');
  });

  it.each([undefined, ''])(
    'preserves the panel description fallback for a library description of %j',
    async (description) => {
      const services = makeEmbeddableServices();
      const { attributes } = createEmptyLensState('lnsMetric', 'Metric');
      services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
        attributes: { ...attributes, description },
      });
      const panel = await buildPanel({ ref_id: 'same-id', description: 'Old fallback' }, services);
      const next = { ref_id: 'same-id', description: 'New fallback' };

      await panel.applySerializedState(next);
      const freshPanel = await buildPanel(next, services);

      panel.setDescription(undefined);
      freshPanel.setDescription(undefined);
      expect(getDescription(panel)).toBe('New fallback');
      expect(getDescription(panel)).toBe(getDescription(freshPanel));
    }
  );

  it('falls back to a retained visualization title when panel overrides are removed', async () => {
    const next = createEmptyLensState('lnsMetric', 'Metric');
    const panel = await buildPanel({ ...next, title: '', hide_title: true });

    await panel.applySerializedState(next);

    expect(getTitle(panel)).toBe('Metric');
    expect(panel.hideTitle$?.getValue()).toBeUndefined();
  });
});
