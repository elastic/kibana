/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as lightTheme } from '@kbn/ui-theme';
import { render } from '@testing-library/react';
import cytoscape from 'cytoscape';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { Controls } from './controls';
import { CytoscapeContext } from './cytoscape';

const cy = cytoscape({
  elements: [{ classes: 'primary', data: { id: 'test node' } }],
});

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <CytoscapeContext.Provider value={cy}>
      <MemoryRouter
        initialEntries={[
          '/service-map?rangeFrom=now-15m&rangeTo=now&environment=ENVIRONMENT_ALL&kuery=',
        ]}
      >
        <MockApmPluginContextWrapper>
          <ThemeContext.Provider value={{ eui: lightTheme }}>
            {children}
          </ThemeContext.Provider>
        </MockApmPluginContextWrapper>
      </MemoryRouter>
      s
    </CytoscapeContext.Provider>
  );
}

describe('Controls', () => {
  describe('with a primary node', () => {
    it('links to the full map', async () => {
      const result = render(<Controls />, { wrapper: Wrapper });
      const { findByTestId } = result;

      const button = await findByTestId('viewFullMapButton');

      expect(button.getAttribute('href')).toEqual(
        '/basepath/app/apm/service-map'
      );
    });
  });
});
