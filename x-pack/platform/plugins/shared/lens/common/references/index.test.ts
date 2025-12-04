/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import type { Reference } from '@kbn/content-management-utils';

import type { LensSerializedState } from '../../public';
import { extractLensReferences, injectLensReferences } from '.';

const getMockPanelReference = (): Reference => ({
  type: 'some-panel-ref',
  id: uuidv4(),
  name: `lens-ref-type-${uuidv4()}`,
});

const getMockDashboardReference = (panelId: string = uuidv4()): Reference => ({
  type: 'some-dashboard-ref',
  id: uuidv4(),
  name: `${panelId}:ref-type-${uuidv4()}`,
});

const getMockLensState = (
  references: Reference[],
  overrides: Partial<LensSerializedState> = {}
): LensSerializedState =>
  ({
    attributes: {
      references,
    },
    ...overrides,
  } as LensSerializedState);

describe('references', () => {
  describe('injectLensReferences', () => {
    it('should return by-ref state', () => {
      const state = getMockLensState([getMockDashboardReference()], { savedObjectId: uuidv4() });
      const references = [getMockPanelReference()];
      const injected = injectLensReferences(state, references);

      expect(injected).toEqual(state);
    });

    it('should inject panel references from dashboard', () => {
      const panelReferences = [getMockPanelReference()];
      const state = getMockLensState([]);
      const injected = injectLensReferences(state, panelReferences);

      expect(injected!.attributes!.references).toEqual(panelReferences);
    });

    it('should inject merge dashboard panel references with attribute references', () => {
      const panelReferences = [getMockPanelReference()];
      const state = getMockLensState([getMockPanelReference()]);
      const injected = injectLensReferences(state, panelReferences);

      expect(injected!.attributes!.references).toEqual([
        ...panelReferences,
        ...state.attributes!.references,
      ]);
    });

    it('should deduplicate merged panel references', () => {
      const panelReferences = [getMockPanelReference(), getMockPanelReference()];
      const state = getMockLensState(panelReferences);
      const injected = injectLensReferences(state, panelReferences);

      expect(injected!.attributes!.references).toEqual(panelReferences);
    });

    // when filtered panel references are empty, dashboards passes all references
    // Thus we need to ensure all the references are panel-specific
    // See https://github.com/elastic/kibana/issues/245283
    it('should filter out dashboard references', () => {
      const panelReferences = [getMockDashboardReference(), getMockDashboardReference()];
      const state = getMockLensState([]);
      const injected = injectLensReferences(state, panelReferences);

      expect(injected!.attributes!.references).toEqual([]);
    });
  });

  describe('extractLensReferences', () => {
    it('should extract references from state attributes', () => {
      const references = [getMockPanelReference(), getMockPanelReference()];
      const state = getMockLensState(references);
      const extracted = extractLensReferences(state);

      expect(extracted.references).toEqual(references);
      expect(extracted.state).toEqual(state);
    });

    it('should extract references from state deprecated state', () => {
      const references = [getMockPanelReference(), getMockPanelReference()];
      const state = getMockLensState([], {
        references,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributes: {} as any,
      });
      const extracted = extractLensReferences(state);

      expect(extracted.references).toEqual(references);
      expect(extracted.state).toEqual(state);
    });
  });
});
