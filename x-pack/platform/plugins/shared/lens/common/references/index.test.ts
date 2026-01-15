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

/**
 * A typical lens reference (i.e. `<ref-type>-<ref-id>`)
 */
const getMockPanelReference = (): Reference => ({
  type: 'some-panel-ref',
  id: uuidv4(),
  name: `lens-ref-type-${uuidv4()}`,
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
      const state = getMockLensState([getMockPanelReference()], { savedObjectId: uuidv4() });
      const references = [getMockPanelReference()];
      const injected = injectLensReferences(state, references);

      expect(injected).toEqual(state);
    });

    it('should not inject erroneous panel references from dashboard', () => {
      const dashboardReferences = [getMockPanelReference(), getMockPanelReference()];
      const state = getMockLensState([]);
      const injected = injectLensReferences(state, dashboardReferences);

      expect(injected!.attributes!.references).toEqual([]);
    });

    it('should fallback to attribute references when dashboard references are empty/missing', () => {
      const panelReferences = [getMockPanelReference(), getMockPanelReference()];
      const state = getMockLensState(panelReferences);
      const injected = injectLensReferences(state, []);

      expect(injected!.attributes!.references).toEqual(panelReferences);
    });

    it('should update panel references with dashboard reference id', () => {
      const dashboardReference = getMockPanelReference();
      const panelReference: Reference = {
        ...dashboardReference,
        id: 'old-lens-reference-id',
      };
      const state = getMockLensState([panelReference]);
      const injected = injectLensReferences(state, [dashboardReference]);

      expect(injected!.attributes!.references).toEqual([dashboardReference]);
    });

    it('should not update reference for different reference type from dashboard', () => {
      const dashboardReference = getMockPanelReference();
      const panelReference: Reference = {
        ...dashboardReference,
        id: 'old-lens-reference-id',
        type: 'wrong-type',
      };
      const state = getMockLensState([panelReference]);
      const injected = injectLensReferences(state, [dashboardReference]);

      expect(injected!.attributes!.references).toEqual([panelReference]);
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
