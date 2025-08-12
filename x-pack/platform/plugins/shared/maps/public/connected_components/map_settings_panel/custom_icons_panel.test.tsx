/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CustomIconsPanel } from './custom_icons_panel';

const defaultProps = {
  customIcons: [],
  updateCustomIcons: () => {},
  deleteCustomIcon: () => {},
};

test('should render', async () => {
  render(
    <I18nProvider>
      <CustomIconsPanel {...defaultProps} />
    </I18nProvider>
  );

  // Verify the Custom icons title is present
  expect(screen.getByText('Custom icons')).toBeInTheDocument();
  
  // Verify empty state description
  expect(screen.getByText('Add a custom icon that can be used in layers in this map.')).toBeInTheDocument();
  
  // Verify Add button is present
  expect(screen.getByText('Add')).toBeInTheDocument();
});

test('should render with custom icons', async () => {
  const customIcons = [
    {
      symbolId: '__kbn__custom_icon_sdf__foobar',
      label: 'My Custom Icon',
      svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
      cutoff: 0.25,
      radius: 0.25,
    },
    {
      symbolId: '__kbn__custom_icon_sdf__bizzbuzz',
      label: 'My Other Custom Icon',
      svg: '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="531.74" height="460.5" overflow="visible" xml:space="preserve"><path stroke="#000" d="M.866 460 265.87 1l265.004 459z"/></svg>',
      cutoff: 0.3,
      radius: 0.15,
    },
  ];
  
  render(
    <I18nProvider>
      <CustomIconsPanel {...defaultProps} customIcons={customIcons} />
    </I18nProvider>
  );

  // Verify the Custom icons title is present
  expect(screen.getByText('Custom icons')).toBeInTheDocument();
  
  // Verify custom icon labels are present
  expect(screen.getByText('My Custom Icon')).toBeInTheDocument();
  expect(screen.getByText('My Other Custom Icon')).toBeInTheDocument();
});
