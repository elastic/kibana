/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import {
  ApplySiemFilterAction,
  getExpressionFromArray,
  getFilterExpression,
} from './apply_siem_filter_action';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';
import { Action } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/actions';
import { expectError } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/tests/helpers';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';
import { Filter } from '@kbn/es-query';

// Using type narrowing to remove all the any's -- https://github.com/elastic/kibana/pull/43965/files#r318796100
const isEmbeddable = (
  embeddable: unknown
): embeddable is IEmbeddable<EmbeddableInput, EmbeddableOutput> => {
  return get('type', embeddable) != null;
};

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
    test('when embeddable type is MAP_SAVED_OBJECT_TYPE and filters exist, returns true', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const embeddable = {
        type: MAP_SAVED_OBJECT_TYPE,
      };
      if (isEmbeddable(embeddable)) {
        const result = await action.isCompatible({
          embeddable,
          filters: [],
        });
        expect(result).toBe(true);
      } else {
        throw new Error('Invalid embeddable in unit test');
      }
    });

    test('when embeddable type is MAP_SAVED_OBJECT_TYPE and filters do not exist, returns false', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const embeddable = {
        type: MAP_SAVED_OBJECT_TYPE,
      };
      if (isEmbeddable(embeddable)) {
        const result = await action.isCompatible({
          embeddable,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        expect(result).toBe(false);
      } else {
        throw new Error('Invalid embeddable in unit test');
      }
    });

    test('when embeddable type is not MAP_SAVED_OBJECT_TYPE, returns false', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const embeddable = {
        type: 'defaultEmbeddable',
      };
      if (isEmbeddable(embeddable)) {
        const result = await action.isCompatible({
          embeddable,
          filters: [],
        });
        expect(result).toBe(false);
      } else {
        throw new Error('Invalid embeddable in unit test');
      }
    });
  });

  describe('#execute', () => {
    test('it throws an error when triggerContext not set', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const embeddable = {
        type: MAP_SAVED_OBJECT_TYPE,
      };
      if (isEmbeddable(embeddable)) {
        const error = expectError(() =>
          action.execute({
            embeddable,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        );
        expect(error).toBeInstanceOf(Error);
      } else {
        throw new Error('Invalid embeddable in unit test');
      }
    });

    test('it calls applyFilterQueryFromKueryExpression() with valid expression', async () => {
      const action = new ApplySiemFilterAction({ applyFilterQueryFromKueryExpression });
      const embeddable = {
        type: MAP_SAVED_OBJECT_TYPE,
        getInput: () => ({
          query: { query: '' },
        }),
      };
      const filters: Filter[] = [
        {
          query: {
            match: {
              'host.name': {
                query: 'zeek-newyork-sha-aa8df15',
                type: 'phrase',
              },
            },
          },
          meta: {
            disabled: false,
            negate: false,
            alias: '',
          },
        },
      ];
      if (isEmbeddable(embeddable)) {
        await action.execute({
          embeddable,
          filters,
        });

        expect(
          (applyFilterQueryFromKueryExpression as jest.Mock<(expression: string) => void>).mock
            .calls[0][0]
        ).toBe('host.name: "zeek-newyork-sha-aa8df15"');
      } else {
        throw new Error('Invalid embeddable in unit test');
      }
    });
  });
});

describe('#getFilterExpression', () => {
  test('it returns an empty expression if no filterValue is provided', () => {
    const layerList = getFilterExpression('host.id', undefined);
    expect(layerList).toEqual('(NOT host.id:*)');
  });

  test('it returns a valid expression when provided single filterValue', () => {
    const layerList = getFilterExpression('host.id', 'aa8df15');
    expect(layerList).toEqual('host.id: "aa8df15"');
  });

  test('it returns a valid expression when provided array filterValue', () => {
    const layerList = getFilterExpression('host.id', ['xavier', 'angela', 'frank']);
    expect(layerList).toEqual('(host.id: "xavier" OR host.id: "angela" OR host.id: "frank")');
  });

  test('it returns a valid expression when provided array filterValue with a single value', () => {
    const layerList = getFilterExpression('host.id', ['xavier']);
    expect(layerList).toEqual('(host.id: "xavier")');
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
