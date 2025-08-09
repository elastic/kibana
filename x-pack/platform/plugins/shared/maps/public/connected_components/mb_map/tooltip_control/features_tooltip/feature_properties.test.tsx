/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

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
    render(
      <I18nProvider>
        <FeatureProperties
          {...defaultProps}
          loadFeatureProperties={async () => {
            return mockTooltipProperties;
          }}
        />
      </I18nProvider>
    );

    // Wait for properties to load and verify they are rendered
    await waitFor(() => {
      expect(screen.getByText('prop1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('prop2')).toBeInTheDocument();
    expect(screen.getByText('foobar1')).toBeInTheDocument();
    expect(screen.getByText('foobar2')).toBeInTheDocument();
  });

  test('should show filter button for filterable properties', async () => {
    render(
      <I18nProvider>
        <FeatureProperties
          {...defaultProps}
          showFilterButtons={true}
          loadFeatureProperties={async () => {
            return mockTooltipProperties;
          }}
        />
      </I18nProvider>
    );

    // Wait for properties to load
    await waitFor(() => {
      expect(screen.getByText('prop1')).toBeInTheDocument();
    });
    
    // Verify filter button is present (should be one since prop1 is filterable, prop2 is not)
    expect(screen.getByLabelText('Filter on property')).toBeInTheDocument();
  });

  test('should show view actions button when there are available actions', async () => {
    render(
      <I18nProvider>
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
      </I18nProvider>
    );

    // Wait for properties to load
    await waitFor(() => {
      expect(screen.getByText('prop1')).toBeInTheDocument();
    });
    
    // Should show properties with available actions
    expect(screen.getByText('prop2')).toBeInTheDocument();
  });

  test('should show error message if unable to load tooltip content', async () => {
    render(
      <I18nProvider>
        <FeatureProperties
          {...defaultProps}
          showFilterButtons={true}
          loadFeatureProperties={async () => {
            throw new Error('Simulated load properties error');
          }}
        />
      </I18nProvider>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Unable to load tooltip content')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Simulated load properties error')).toBeInTheDocument();
  });
});
