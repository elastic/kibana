/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import { getEsqlVariables } from './get_esql_variables';

// How a control's selected options become a value is tested with the conversion, in
// `@kbn/esql-utils`. This covers what is specific to a dashboard: finding the ES|QL controls among
// the pinned panels and reading their `config`.
const esqlControl = (name: string, selected: string[], extra: Record<string, unknown> = {}) => ({
  id: `control-${name}`,
  type: ESQL_CONTROL,
  config: { variable_name: name, variable_type: 'values', selected_options: selected, ...extra },
});

describe('getEsqlVariables', () => {
  it('publishes the value of an ES|QL control under its variable name', () => {
    expect(getEsqlVariables([esqlControl('host', ['web-1'])])).toEqual([
      { key: 'host', value: 'web-1', type: 'values' },
    ]);
  });

  it('reads one variable per ES|QL control, in order, however the control selects', () => {
    expect(
      getEsqlVariables([
        esqlControl('a', ['1'], { control_type: 'STATIC_VALUES' }),
        esqlControl('b', ['x', 'y'], { variable_type: 'multi_values', single_select: false }),
      ])
    ).toEqual([
      { key: 'a', value: 1, type: 'values' },
      { key: 'b', value: ['x', 'y'], type: 'multi_values' },
    ]);
  });

  it('skips controls that are not ES|QL variable controls', () => {
    expect(
      getEsqlVariables([
        { id: 'c1', type: 'options_list_control', config: { field_name: 'host.name' } },
        { id: 'c2', type: 'range_slider_control', config: { field_name: 'bytes' } },
        esqlControl('host', ['web-1']),
      ])
    ).toEqual([{ key: 'host', value: 'web-1', type: 'values' }]);
  });

  it('does not read the config of a control that is not an ES|QL control, even if it looks like one', () => {
    expect(
      getEsqlVariables([
        {
          id: 'c1',
          type: 'options_list_control',
          config: { variable_name: 'host', variable_type: 'values', selected_options: ['a'] },
        },
      ])
    ).toEqual([]);
  });

  it.each([
    ['no config', { id: 'c', type: ESQL_CONTROL }],
    ['a config that is not an object', { id: 'c', type: ESQL_CONTROL, config: 'nope' }],
    ['a config that is a list', { id: 'c', type: ESQL_CONTROL, config: [] }],
    ['a config with no variable name', { id: 'c', type: ESQL_CONTROL, config: {} }],
  ])('skips an ES|QL control with %s instead of failing', (_label, control) => {
    expect(getEsqlVariables([control])).toEqual([]);
  });

  it('returns nothing for no controls', () => {
    expect(getEsqlVariables([])).toEqual([]);
  });
});
