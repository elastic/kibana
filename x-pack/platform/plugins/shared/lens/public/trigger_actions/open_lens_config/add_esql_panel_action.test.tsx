/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { AddESQLPanelAction } from './add_esql_panel_action';

describe('create Lens panel action', () => {
  const core = coreMock.createStart();
  const mockPresentationContainer = getMockPresentationContainer();

  describe('compatibility check', () => {
    it('is incompatible if ui setting for ES|QL is off', async () => {
      const action = new AddESQLPanelAction(core);

      const isCompatible = await action.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible if ui setting for ES|QL is on', async () => {
      const updatedCore = {
        ...core,
        uiSettings: {
          ...core.uiSettings,
          get: (setting: string) => {
            return setting === 'enableESQL';
          },
        },
      } as CoreStart;

      const action = new AddESQLPanelAction(updatedCore);

      const isCompatible = await action.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeTruthy();
    });
  });
});
