/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable } from './embeddable';
import { TimeRange } from 'ui/timefilter/time_history';
import { Query } from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import { Document } from '../../persistence';
import { act } from 'react-dom/test-utils';

const savedVis: Document = {
  datasourceType: '',
  expression: 'my | expression',
  state: {
    visualization: {},
    datasource: {},
    datasourceMetaData: {
      filterableIndexPatterns: [],
    },
  },
  title: 'My title',
  visualizationType: '',
};

describe('embeddable', () => {
  it('should render expression with expression renderer', () => {
    const mountpoint = document.createElement('div');
    const expressionRenderer = jest.fn(_props => null);
    const embeddable = new Embeddable(
      expressionRenderer,
      {
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123' }
    );
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.expression).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "filters": Array [],
              "query": Array [],
              "timeRange": Array [],
            },
            "function": "kibana_context",
            "type": "function",
          },
          Object {
            "arguments": Object {},
            "function": "my",
            "type": "function",
          },
          Object {
            "arguments": Object {},
            "function": "expression",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
    mountpoint.remove();
  });

  it('should display error if expression renderering fails', () => {
    const mountpoint = document.createElement('div');
    const expressionRenderer = jest.fn(_props => null);

    const embeddable = new Embeddable(
      expressionRenderer,
      {
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123' }
    );
    embeddable.render(mountpoint);

    act(() => {
      expressionRenderer.mock.calls[0][0]!.onRenderFailure({});
    });

    expect(mountpoint.innerHTML).toContain("Visualization couldn't be displayed");

    mountpoint.remove();
  });

  it('should prepend context to the expression chain', () => {
    const mountpoint = document.createElement('div');
    const expressionRenderer = jest.fn(_props => null);
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const embeddable = new Embeddable(
      expressionRenderer,
      {
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123', timeRange, query, filters }
    );
    embeddable.render(mountpoint);

    expect(expressionRenderer.mock.calls[0][0]!.expression.chain[0].arguments).toEqual({
      timeRange: [JSON.stringify(timeRange)],
      query: [JSON.stringify(query)],
      filters: [JSON.stringify(filters)],
    });
    mountpoint.remove();
  });

  it('should re-render if new input is pushed', () => {
    const mountpoint = document.createElement('div');
    const expressionRenderer = jest.fn(_props => null);
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const embeddable = new Embeddable(
      expressionRenderer,
      {
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123' }
    );
    embeddable.render(mountpoint);

    embeddable.updateInput({
      timeRange,
      query,
      filters,
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(2);

    expect(expressionRenderer.mock.calls[1][0]!.expression.chain[0].arguments).toEqual({
      timeRange: [JSON.stringify(timeRange)],
      query: [JSON.stringify(query)],
      filters: [JSON.stringify(filters)],
    });
    mountpoint.remove();
  });

  it('should not re-render if only change is in disabled filter', () => {
    const mountpoint = document.createElement('div');
    const expressionRenderer = jest.fn(_props => null);
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];

    const embeddable = new Embeddable(
      expressionRenderer,
      {
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123', timeRange, query, filters }
    );
    embeddable.render(mountpoint);

    embeddable.updateInput({
      timeRange,
      query,
      filters: [{ meta: { alias: 'test', negate: true, disabled: true } }],
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    mountpoint.remove();
  });
});
