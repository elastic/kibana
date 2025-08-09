/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { Footer } from './footer';
import { IVectorLayer } from '../../../../classes/layers/vector_layer';

const defaultProps = {
  isLocked: false,
  findLayerById: (id: string) => {
    return {
      async getDisplayName() {
        return `display + ${id}`;
      },
      getId() {
        return id;
      },
    } as unknown as IVectorLayer;
  },
  setCurrentFeature: () => {},
};

describe('Footer', () => {
  describe('single feature:', () => {
    const SINGLE_FEATURE = [
      {
        id: 'feature1',
        layerId: 'layer1',
        mbProperties: {},
        actions: [],
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should not render header', async () => {
        const { container } = render(
          <I18nProvider>
            <Footer {...defaultProps} features={SINGLE_FEATURE} />
          </I18nProvider>
        );

        // Single feature should render nothing (empty fragment)
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('multiple features, single layer:', () => {
    const MULTI_FEATURES_SINGE_LAYER = [
      {
        id: 'feature1',
        layerId: 'layer1',
        mbProperties: {},
        actions: [],
      },
      {
        id: 'feature2',
        layerId: 'layer1',
        mbProperties: {},
        actions: [],
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should only show features count', async () => {
        render(
          <I18nProvider>
            <Footer {...defaultProps} features={MULTI_FEATURES_SINGE_LAYER} />
          </I18nProvider>
        );

        // Should show page number for multiple features when unlocked
        await waitFor(() => {
          expect(screen.getByText('1 of 2')).toBeInTheDocument();
        });
      });
    });
    describe('locked', () => {
      test('should show pagination controls and features count', async () => {
        render(
          <I18nProvider>
            <Footer {...defaultProps} isLocked={true} features={MULTI_FEATURES_SINGE_LAYER} />
          </I18nProvider>
        );

        // Should show pagination for locked mode with multiple features
        await waitFor(() => {
          expect(screen.getByRole('navigation')).toBeInTheDocument();
        });
      });
    });
  });

  describe('multiple features, multiple layers:', () => {
    const MULTI_FEATURES_MULTI_LAYERS = [
      {
        id: 'feature1',
        layerId: 'layer1',
        mbProperties: {},
        actions: [],
      },
      {
        id: 'feature2',
        layerId: 'layer1',
        mbProperties: {},
        actions: [],
      },
      {
        id: 'feature1',
        layerId: 'layer2',
        mbProperties: {},
        actions: [],
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should only show features count', async () => {
        render(
          <I18nProvider>
            <Footer {...defaultProps} features={MULTI_FEATURES_MULTI_LAYERS} />
          </I18nProvider>
        );

        // Should show page number for multiple features when unlocked
        await waitFor(() => {
          expect(screen.getByText('1 of 3')).toBeInTheDocument();
        });
      });
    });
    describe('locked', () => {
      test('should show pagination controls, features count, and layer select', async () => {
        render(
          <I18nProvider>
            <Footer {...defaultProps} isLocked={true} features={MULTI_FEATURES_MULTI_LAYERS} />
          </I18nProvider>
        );

        // Should show pagination and layer select for locked mode with multiple layers
        await waitFor(() => {
          expect(screen.getByRole('navigation')).toBeInTheDocument();
        });
        
        await waitFor(() => {
          expect(screen.getByLabelText('Filter results by layer')).toBeInTheDocument();
        });
      });
    });
  });
});
