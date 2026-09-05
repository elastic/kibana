/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import { useESQLVariables } from './use_esql_variables';

const getAttributes = (): TypedLensSerializedState['attributes'] =>
  ({
    title: '',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: { query: '', language: 'kuery' },
      filters: [],
      datasourceStates: {
        textBased: {
          layers: {
            layer1: { query: { esql: 'FROM index1' }, columns: [], index: 'index1' },
            layer2: { query: { esql: 'FROM index2' }, columns: [], index: 'index2' },
          },
        },
      },
      visualization: {},
    },
  } as unknown as TypedLensSerializedState['attributes']);

const getParentApi = (panel: { updateAttributes: jest.Mock; onEdit: jest.Mock }) => ({
  addNewPanel: jest.fn().mockResolvedValue(undefined),
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  getPanelCount: jest.fn(),
  children$: new BehaviorSubject<Record<string, unknown>>({ panel1: panel }),
  esqlVariables$: new BehaviorSubject([]),
});

describe('useESQLVariables', () => {
  const setup = (layerId: string) => {
    const panel = {
      updateAttributes: jest.fn(),
      onEdit: jest.fn().mockResolvedValue(undefined),
    };
    const parentApi = getParentApi(panel);
    const { result } = renderHook(() =>
      useESQLVariables({
        parentApi,
        attributes: getAttributes(),
        panelId: 'panel1',
        layerId,
        closeFlyout: jest.fn(),
      })
    );
    return { result, panel, parentApi };
  };

  it('should update only the edited layer query on save', async () => {
    const { result, panel } = setup('layer2');

    await act(() => result.current.onSaveControl({}, 'FROM index2 | WHERE a == ?var'));

    expect(panel.updateAttributes).toHaveBeenCalledTimes(1);
    const updated = panel.updateAttributes.mock.calls[0][0];
    expect(updated.state.datasourceStates.textBased.layers).toEqual({
      layer1: expect.objectContaining({ query: { esql: 'FROM index1' } }),
      layer2: expect.objectContaining({ query: { esql: 'FROM index2 | WHERE a == ?var' } }),
    });
    expect(panel.onEdit).toHaveBeenCalled();
  });

  it('should not touch any layer for an unknown layerId', async () => {
    const { result, panel } = setup('unknown');

    await act(() => result.current.onSaveControl({}, 'FROM other | WHERE a == ?var'));

    expect(panel.updateAttributes).toHaveBeenCalledTimes(1);
    const updated = panel.updateAttributes.mock.calls[0][0];
    expect(updated.state.datasourceStates).toEqual(getAttributes().state.datasourceStates);
  });
});
