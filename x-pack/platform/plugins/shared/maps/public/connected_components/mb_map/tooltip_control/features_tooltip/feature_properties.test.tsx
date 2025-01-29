/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FeatureProperties } from './feature_properties';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { ITooltipProperty } from '../../../../classes/tooltips/tooltip_property';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';

class MockTooltipProperty {
  private _key: string;
  private _value: string;
  private _isFilterable: boolean;

  constructor(key: string, value: string, isFilterable: boolean) {
    this._key = key;
    this._value = value;
    this._isFilterable = isFilterable;
  }

  isFilterable() {
    return this._isFilterable;
  }

  getHtmlDisplayValue() {
    return this._value;
  }

  getPropertyKey() {
    return this._key;
  }

  getPropertyName() {
    return this._key;
  }
}

const defaultProps = {
  loadFeatureProperties: async () => {
    return [];
  },
  featureId: `feature`,
  layerId: `layer`,
  mbProperties: {},
  onCloseTooltip: () => {},
  showFilterButtons: false,
  addFilters: async () => {},
  getActionContext: () => {
    return {} as unknown as ActionExecutionContext;
  },
  getFilterActions: async () => {
    return [{ id: ACTION_GLOBAL_APPLY_FILTER } as unknown as Action];
  },
  showFilterActions: () => {},
};

const mockTooltipProperties = [
  new MockTooltipProperty('prop1', 'foobar1', true) as unknown as ITooltipProperty,
  new MockTooltipProperty('prop2', 'foobar2', false) as unknown as ITooltipProperty,
];

describe('FeatureProperties', () => {
  test('should render', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        loadFeatureProperties={async () => {
          return mockTooltipProperties;
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should show filter button for filterable properties', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={async () => {
          return mockTooltipProperties;
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should show view actions button when there are available actions', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={async () => {
          return mockTooltipProperties;
        }}
        getFilterActions={async () => {
          return [{ id: 'drilldown1' } as unknown as Action];
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should show error message if unable to load tooltip content', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={async () => {
          throw new Error('Simulated load properties error');
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
