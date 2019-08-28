/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplySiemFilterAction, getExpressionFromArray } from './apply_siem_filter_action';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';
import { Action } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/actions';
import { expectError } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/tests/helpers';

describe('ApplySiemFilterAction', () => {
  let applyFilterQueryFromKueryExpression: (expression: string) => void;

  beforeEach(() => {
    applyFilterQueryFromKueryExpression = jest.fn(expression => {});
  });

  test('it is an instance of Action', () => {
    const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
    expect(action).toBeInstanceOf(Action);
  });

  test('it has APPLY_SIEM_FILTER_ACTION_ID type and id', () => {
    const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
    expect(action.id).toBe('APPLY_SIEM_FILTER_ACTION_ID');
    expect(action.type).toBe('APPLY_SIEM_FILTER_ACTION_ID');
  });

  test('it has expected display name', () => {
    const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
    expect(action.getDisplayName()).toMatchInlineSnapshot(`"Apply filter"`);
  });

  describe('#isCompatible', () => {
    test('when embeddable type is MAP_SAVED_OBJECT_TYPE and triggerContext filters exist, returns true', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const result = await action.isCompatible({
        embeddable: {
          type: MAP_SAVED_OBJECT_TYPE,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        triggerContext: {
          filters: [],
        },
      });
      expect(result).toBe(true);
    });

    test('when embeddable type is MAP_SAVED_OBJECT_TYPE and triggerContext does not exist, returns false', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const result = await action.isCompatible({
        embeddable: {
          type: MAP_SAVED_OBJECT_TYPE,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      expect(result).toBe(false);
    });

    test('when embeddable type is MAP_SAVED_OBJECT_TYPE and triggerContext filters do not exist, returns false', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const result = await action.isCompatible({
        embeddable: {
          type: MAP_SAVED_OBJECT_TYPE,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        triggerContext: {} as any,
      });
      expect(result).toBe(false);
    });

    test('when embeddable type is not MAP_SAVED_OBJECT_TYPE, returns false', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const result = await action.isCompatible({
        embeddable: {
          type: 'defaultEmbeddable',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        triggerContext: {
          filters: [],
        },
      });
      expect(result).toBe(false);
    });
  });

  describe('#execute', () => {
    test('it throws an error when triggerContext not set', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const error = expectError(() =>
        action.execute({
          embeddable: {
            type: MAP_SAVED_OBJECT_TYPE,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      );
      expect(error).toBeInstanceOf(Error);
    });

    test('it throws and TypeError when not compatible', () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const error = expectError(() =>
        action.execute({
          embeddable: {
            type: 'defaultEmbeddable',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          triggerContext: {
            filters: [],
          },
        })
      );
      expect(error).toBeInstanceOf(TypeError);
    });

    test('it calls applyFilterQueryFromKueryExpression() with valid expression', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });

      await action.execute({
        embeddable: {
          type: MAP_SAVED_OBJECT_TYPE,
          getInput: () => ({
            query: { query: '' },
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        // @ts-ignore partial type
        triggerContext: {
          filters: [
            {
              query: {
                match: {
                  'host.name': {
                    query: 'zeek-newyork-sha-aa8df15',
                    type: 'phrase',
                  },
                },
              },
            },
          ],
        },
      });

      expect(
        (applyFilterQueryFromKueryExpression as jest.Mock<(expression: string) => void>).mock
          .calls[0][0]
      ).toBe('host.name: "zeek-newyork-sha-aa8df15"');
    });
  });
});

describe('#getExpressionFromArray', () => {
  test('it returns an empty expression if no filterValues are provided', () => {
    const layerList = getExpressionFromArray('host.id', []);
    expect(layerList).toEqual('');
  });

  test('it returns a valid expression when provided multiple filterValues', () => {
    const layerList = getExpressionFromArray('host.id', ['xavier', 'angela', 'frank']);
    expect(layerList).toEqual('(host.id: "xavier" OR host.id: "angela" OR host.id: "frank")');
  });
});
