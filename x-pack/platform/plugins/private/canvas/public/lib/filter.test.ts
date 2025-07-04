/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter';
import { FC } from 'react';
import {
  Filter as FilterType,
  FilterViewInstance,
  FlattenFilterViewInstance,
  SimpleFilterViewField,
} from '../../types';
import {
  defaultFormatter,
  formatFilterView,
  flattenFilterView,
  createFilledFilterView,
  groupFiltersBy,
  getFiltersExprsFromExpression,
  getFiltersByFilterExpressions,
  isExpressionWithFilters,
} from './filter';

const formatterFactory = (value: unknown) => () => JSON.stringify(value);
const fc: FC<any> = () => null;

const simpleFilterValue: FilterType = {
  type: 'exactly',
  column: 'project',
  value: 'kibana',
  filterGroup: 'someGroup',
};

const filterWithNestedValue: FilterType = {
  type: 'exactlyNested' as any,
  column: 'project',
  value: { nestedField1: 'nestedField1', nestedField2: 'nestedField2' },
  filterGroup: 'someGroup',
};

const simpleFilterView: FilterViewInstance = {
  type: { label: 'label' },
  column: { label: 'column' },
  value: { label: 'value' },
  filterGroup: { label: 'filterGroup' },
};

const nestedFilterView: FilterViewInstance = {
  type: { label: 'label' },
  column: { label: 'column' },
  value: (value: unknown) => ({
    nested: {
      label: 'nested',
      formatter: formatterFactory(value),
    },
  }),
  filterGroup: { label: 'filterGroup' },
};

describe('defaultFormatter', () => {
  it('returns string when passed not null/undefined/falsy/emtpy value', () => {
    expect(defaultFormatter(10)).toBe('10');
    expect(defaultFormatter('10')).toBe('10');
    const objToFormat = { field: 10 };
    expect(defaultFormatter(objToFormat)).toBe(objToFormat.toString());
    const arrToFormat = [10, 20];
    expect(defaultFormatter(arrToFormat)).toBe(arrToFormat.toString());
  });

  it("returns '-' when passed null/undefined/falsy/emtpy value", () => {
    const empty = '-';
    expect(defaultFormatter(null)).toBe(empty);
    expect(defaultFormatter(undefined)).toBe(empty);
    expect(defaultFormatter('')).toBe(empty);
    expect(defaultFormatter(false)).toBe(empty);
  });
});

describe('flattenFilterView returns fn which', () => {
  it('returns the same filter view if it expects all fiends to be simple values', () => {
    const flattenFn = flattenFilterView(simpleFilterValue);
    expect(flattenFn(simpleFilterView)).toEqual(simpleFilterView);
  });

  it('returns the same filter view if filterValue is empty object', () => {
    const flattenFn = flattenFilterView({} as any);
    expect(flattenFn(simpleFilterView)).toEqual(simpleFilterView);
  });

  it('returns empty filter view if filter view is empty object', () => {
    const flattenFn = flattenFilterView(simpleFilterValue);
    expect(flattenFn({} as any)).toEqual({});
  });

  it('returns single nesting filter view if it expects some fields to be nested objects', () => {
    const flattenFn = flattenFilterView(filterWithNestedValue);
    const { value, ...restExpectedFields } = nestedFilterView;
    const flattenFilterViewRes = flattenFn(nestedFilterView);

    expect(flattenFilterViewRes).toEqual({
      ...restExpectedFields,
      nested: {
        label: 'nested',
        formatter: expect.any(Function),
      },
    });
    expect(flattenFilterViewRes.nested.formatter?.()).toBe(
      formatterFactory(filterWithNestedValue.value)()
    );
  });

  it('returns single nesting filter view if filterValue is empty object', () => {
    const flattenFn = flattenFilterView({} as any);
    const { value, ...rest } = nestedFilterView;
    expect(flattenFn(nestedFilterView)).toEqual({
      ...rest,
      nested: {
        label: 'nested',
        formatter: expect.any(Function),
      },
    });
  });
});

describe('formatFilterView returns fn which', () => {
  const simpleFlattenFilterView: FlattenFilterViewInstance = {
    type: { label: 'label' },
    value: { label: 'value' },
    column: { label: 'column' },
    filterGroup: { label: 'filterGroup' },
    nestedField: { label: 'nestedField', formatter: () => 'null' },
  };

  it('returns formatted filter view with any passed keys', () => {
    const formatFn = formatFilterView(simpleFilterValue);
    expect(formatFn(simpleFlattenFilterView)).toEqual({
      type: { label: 'label', formattedValue: simpleFilterValue.type },
      value: { label: 'value', formattedValue: simpleFilterValue.value },
      column: { label: 'column', formattedValue: simpleFilterValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
      nestedField: { label: 'nestedField', formattedValue: 'null' },
    });
  });

  it("returns formatted filter view with formattedValue = '-' ", () => {
    const formatFn = formatFilterView({} as any);
    expect(formatFn(simpleFlattenFilterView)).toEqual({
      type: { label: 'label', formattedValue: '-' },
      value: { label: 'value', formattedValue: '-' },
      column: { label: 'column', formattedValue: '-' },
      filterGroup: { label: 'filterGroup', formattedValue: '-' },
      nestedField: { label: 'nestedField', formattedValue: 'null' },
    });
  });

  it('returns emtpy object when filter view is empty object', () => {
    const formatFn = formatFilterView(simpleFilterValue);
    expect(formatFn({} as any)).toEqual({});
  });

  it('returns filter view fields with component property if defined at filter view', () => {
    const flattenFilterViewWithComponent: FlattenFilterViewInstance = {
      ...simpleFlattenFilterView,
      nestedField: {
        ...simpleFlattenFilterView.nestedField,
        component: fc,
      },
    };

    const formatFn = formatFilterView(simpleFilterValue);
    expect(formatFn(flattenFilterViewWithComponent)).toEqual({
      type: { label: 'label', formattedValue: simpleFilterValue.type },
      value: { label: 'value', formattedValue: simpleFilterValue.value },
      column: { label: 'column', formattedValue: simpleFilterValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
      nestedField: { label: 'nestedField', formattedValue: 'null', component: fc },
    });
  });
});

describe('createFilledFilterView', () => {
  it('returns simple filter view with formattedValue and components', () => {
    const simpleFilterValueWithComponent = {
      ...simpleFilterView,
      value: {
        ...(simpleFilterView.value as SimpleFilterViewField),
        component: fc,
      },
    };

    expect(createFilledFilterView(simpleFilterValueWithComponent, simpleFilterValue)).toEqual({
      type: { label: 'label', formattedValue: simpleFilterValue.type },
      value: { label: 'value', formattedValue: simpleFilterValue.value, component: fc },
      column: { label: 'column', formattedValue: simpleFilterValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: simpleFilterValue.filterGroup },
    });
  });

  it('returns nested filter view with formattedValue and components', () => {
    const nestedFilterViewWithComponent = {
      ...nestedFilterView,
      value: (value: unknown) => ({
        nested: {
          label: 'nested',
          formatter: formatterFactory(value),
          component: fc,
        },
      }),
    };

    expect(createFilledFilterView(nestedFilterViewWithComponent, filterWithNestedValue)).toEqual({
      type: { label: 'label', formattedValue: filterWithNestedValue.type },
      column: { label: 'column', formattedValue: filterWithNestedValue.column },
      filterGroup: { label: 'filterGroup', formattedValue: filterWithNestedValue.filterGroup },
      nested: {
        label: 'nested',
        formattedValue: formatterFactory(filterWithNestedValue.value)(),
        component: fc,
      },
    });
  });
});

describe('groupFiltersBy', () => {
  const filters: FilterType[] = [
    { type: 'exactly', column: 'project', value: 'kibana', filterGroup: 'someGroup' },
    {
      type: 'time',
      column: '@timestamp',
      value: { from: 'some time', to: 'some time' },
      filterGroup: 'someGroup2',
    },
    { type: 'exactly', column: 'country', value: 'US', filterGroup: 'someGroup2' },
    {
      type: 'time',
      column: 'time',
      value: { from: 'some time', to: 'some time' },
      filterGroup: null,
    },
  ];

  it('groups by type', () => {
    const grouped = groupFiltersBy(filters, 'type');
    expect(grouped).toEqual([
      { name: 'exactly', filters: [filters[0], filters[2]] },
      { name: 'time', filters: [filters[1], filters[3]] },
    ]);
  });

  it('groups by column', () => {
    const grouped = groupFiltersBy(filters, 'column');
    expect(grouped).toEqual([
      { name: 'project', filters: [filters[0]] },
      { name: '@timestamp', filters: [filters[1]] },
      { name: 'country', filters: [filters[2]] },
      { name: 'time', filters: [filters[3]] },
    ]);
  });

  it('groups by filterGroup', () => {
    const grouped = groupFiltersBy(filters, 'filterGroup');
    expect(grouped).toEqual([
      { name: 'someGroup', filters: [filters[0]] },
      { name: 'someGroup2', filters: [filters[1], filters[2]] },
      { name: null, filters: [filters[3]] },
    ]);
  });

  it('groups by field on empty array', () => {
    const grouped = groupFiltersBy([], 'filterGroup');
    expect(grouped).toEqual([]);
  });

  it('groups by empty field', () => {
    const filtersWithoutGroups = filters.map(({ filterGroup, ...rest }) => ({
      ...rest,
      filterGroup: null,
    }));

    const grouped = groupFiltersBy(filtersWithoutGroups, 'filterGroup');
    expect(grouped).toEqual([{ name: null, filters: filtersWithoutGroups }]);
  });
});

describe('getFiltersByFilterExpressions', () => {
  const group1 = 'Group 1';
  const group2 = 'Group 2';

  const filters = [
    `exactly value="x-pack" column="project1" filterGroup="${group1}"`,
    `exactly value="beats" column="project1" filterGroup="${group2}"`,
    `exactly value="machine-learning" column="project1"`,
    `exactly value="kibana" column="project2" filterGroup="${group2}"`,
  ];

  const filtersExprWithGroup = `filters group="${group2}"`;

  const kibanaExpr = 'kibana';
  const selectFilterExprEmpty = 'selectFilter';
  const selectFilterExprWithGroup = `${selectFilterExprEmpty} group="${group2}"`;
  const selectFilterExprWithGroups = `${selectFilterExprEmpty} group="${group2}" group="${group1}"`;
  const selectFilterExprWithUngrouped = `${selectFilterExprEmpty} ungrouped=true`;
  const selectFilterExprWithGroupAndUngrouped = `${selectFilterExprEmpty}  group="${group2}" ungrouped=true`;

  const removeFilterExprEmpty = 'removeFilter';
  const removeFilterExprWithGroup = `${removeFilterExprEmpty} group="${group2}"`;
  const removeFilterExprWithUngrouped = `${removeFilterExprEmpty} ungrouped=true`;
  const removeFilterExprWithGroupAndUngrouped = `${removeFilterExprEmpty} group="${group2}" ungrouped=true`;

  const getFiltersAsts = (filtersExprs: string[]) => {
    const ast = fromExpression(filtersExprs.join(' | '));
    return ast.chain;
  };

  it('returns all filters if no arguments specified to selectFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, selectFilterExprEmpty]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual(filters);
  });

  it('returns filters with group, specified to selectFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, selectFilterExprWithGroups]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[0], filters[1], filters[3]]);
  });

  it('returns filters without group if ungrouped is true at selectFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, selectFilterExprWithUngrouped]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[2]]);
  });

  it('returns filters with group if ungrouped is true and groups are not empty at selectFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, selectFilterExprWithGroupAndUngrouped]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[1], filters[2], filters[3]]);
  });

  it('returns no filters if no arguments, specified to removeFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, removeFilterExprEmpty]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([]);
  });

  it('returns filters without group, specified to removeFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, removeFilterExprWithGroup]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[0], filters[2]]);
  });

  it('returns filters without group if ungrouped is true at removeFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, removeFilterExprWithUngrouped]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[0], filters[1], filters[3]]);
  });

  it('remove filters without group and with specified group if ungrouped is true and groups are not empty at removeFilter expression', () => {
    const filtersExprs = getFiltersAsts([kibanaExpr, removeFilterExprWithGroupAndUngrouped]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[0]]);
  });

  it('should include/exclude filters iteratively', () => {
    const filtersExprs = getFiltersAsts([
      kibanaExpr,
      selectFilterExprWithGroup,
      removeFilterExprWithGroup,
      selectFilterExprEmpty,
    ]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([]);
  });

  it('should include/exclude filters from global filters if `filters` expression is specified', () => {
    const filtersExprs = getFiltersAsts([
      kibanaExpr,
      selectFilterExprWithGroup,
      removeFilterExprWithGroup,
      selectFilterExprEmpty,
      filtersExprWithGroup,
    ]);
    const matchedFilters = getFiltersByFilterExpressions(filters, filtersExprs);
    expect(matchedFilters).toEqual([filters[1], filters[3]]);
  });
});

describe('getFiltersExprsFromExpression', () => {
  it('returns list of filters expressions asts', () => {
    const filter1 = 'selectFilter';
    const filter2 = 'filters group="15" ungrouped=true';
    const filter3 = 'removeFilter';
    const expression = `kibana | ${filter1} | ${filter2} | ${filter3} | demodata | plot | render`;
    const filtersAsts = getFiltersExprsFromExpression(expression);

    expect(filtersAsts).toEqual([filter1, filter2, filter3].map((f) => fromExpression(f).chain[0]));
  });
});

describe('isExpressionWithFilters', () => {
  it('checks if the expression is applying filters', () => {
    const expression =
      'filters group="10" group="11" | filters group="15" ungrouped=true | demodata | plot | render';
    expect(isExpressionWithFilters(expression)).toBeTruthy();

    const nextExpression = 'demodata | plot | render';
    expect(isExpressionWithFilters(nextExpression)).toBeFalsy();
  });
});
