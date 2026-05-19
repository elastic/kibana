/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Feature } from '@kbn/streams-schema';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';
import { DEPENDENCY_FEATURE_TYPE } from '../utils/get_ki_dependencies';

function makeFeature(overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>): Feature {
  return {
    stream_name: 'test-stream',
    description: '',
    properties: {},
    confidence: 80,
    uuid: overrides.id,
    status: 'active',
    last_seen: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeFeatureKI(
  overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>
): KnowledgeIndicator {
  return { kind: 'feature', feature: makeFeature(overrides) };
}

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('KnowledgeIndicatorFeatureDetailsContent', () => {
  const baseFeature = makeFeature({
    id: 'checkout-service',
    type: 'entity',
    title: 'Checkout Service',
    description: 'Handles checkout flow',
    confidence: 85,
    properties: { region: 'us-east-1' },
    tags: ['backend', 'critical'],
    evidence: ['Found in logs', 'Seen in traces'],
    meta: { source: 'auto' },
    subtype: 'microservice',
    last_seen: '2026-05-01T00:00:00Z',
    expires_at: '2026-06-01T00:00:00Z',
  });

  it('renders general information fields', () => {
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

    expect(screen.getByTestId('streamsAppFeatureDetailsFlyoutId')).toHaveTextContent(
      'checkout-service'
    );
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('microservice')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

    expect(screen.getByText('Handles checkout flow')).toBeInTheDocument();
  });

  it('renders fallback when description is empty', () => {
    const feature = makeFeature({ id: 'test', type: 'entity', description: '' });
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);

    expect(screen.getByText('No description available')).toBeInTheDocument();
  });

  it('renders tags', () => {
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders empty value when no tags', () => {
    const feature = makeFeature({ id: 'test', type: 'entity', tags: [] });
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);

    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders evidence items', () => {
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

    expect(screen.getByText('Found in logs')).toBeInTheDocument();
    expect(screen.getByText('Seen in traces')).toBeInTheDocument();
  });

  it('renders fallback when no evidence', () => {
    const feature = makeFeature({ id: 'test', type: 'entity' });
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);

    expect(screen.getByText('No evidence available')).toBeInTheDocument();
  });

  it('renders meta as JSON', () => {
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

    const metaPanel = screen.getByTestId('streamsAppFeatureDetailsFlyoutMeta');
    expect(metaPanel).toHaveTextContent(/"source": "auto"/);
  });

  it('renders fallback when no meta', () => {
    const feature = makeFeature({ id: 'test', type: 'entity' });
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);

    expect(screen.getByText('No meta information')).toBeInTheDocument();
  });

  it('renders raw document JSON', () => {
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

    const rawDoc = screen.getByTestId('streamsAppFeatureDetailsFlyoutRawDocument');
    expect(rawDoc).toHaveTextContent('checkout-service');
  });

  it('renders string properties', () => {
    const feature = makeFeature({
      id: 'test',
      type: 'entity',
      properties: { region: 'us-east-1', count: 42 },
    });
    renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);

    expect(screen.getByText('region')).toBeInTheDocument();
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
    // non-string properties are filtered out
    expect(screen.queryByText('count')).not.toBeInTheDocument();
  });

  describe('dependencies panel', () => {
    const paymentKI = makeFeatureKI({
      id: 'payment-service',
      type: 'entity',
      title: 'Payment Service',
    });
    const depKI = makeFeatureKI({
      id: 'dep-checkout-payment',
      type: DEPENDENCY_FEATURE_TYPE,
      properties: { source: 'checkout', target: 'payment' },
    });

    it('does not render dependencies panel without allKnowledgeIndicators', () => {
      renderWithProviders(<KnowledgeIndicatorFeatureDetailsContent feature={baseFeature} />);

      expect(screen.queryByText('Dependencies')).not.toBeInTheDocument();
    });

    it('renders empty dependencies message when no relationships found', () => {
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={baseFeature}
          allKnowledgeIndicators={[makeFeatureKI({ ...baseFeature })]}
        />
      );

      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('No dependency relationships found')).toBeInTheDocument();
    });

    it('renders dependency table when relationships exist', () => {
      const checkoutFeatureKI = makeFeatureKI({ ...baseFeature });
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={baseFeature}
          allKnowledgeIndicators={[checkoutFeatureKI, paymentKI, depKI]}
        />
      );

      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('Depends on')).toBeInTheDocument();
      expect(screen.getByText('Payment Service')).toBeInTheDocument();
    });

    it('does not render dependencies panel for dependency-type features', () => {
      const depFeature = makeFeature({
        id: 'dep-1',
        type: DEPENDENCY_FEATURE_TYPE,
        properties: { source: 'a', target: 'b' },
      });
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent feature={depFeature} allKnowledgeIndicators={[]} />
      );

      expect(screen.queryByText('Dependencies')).not.toBeInTheDocument();
    });

    it('calls onNavigateTo when clicking a dependency KI link', async () => {
      const onNavigateTo = jest.fn();
      const checkoutFeatureKI = makeFeatureKI({ ...baseFeature });
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={baseFeature}
          allKnowledgeIndicators={[checkoutFeatureKI, paymentKI, depKI]}
          onNavigateTo={onNavigateTo}
        />
      );

      await userEvent.click(screen.getByText('Payment Service'));
      expect(onNavigateTo).toHaveBeenCalledWith(paymentKI);
    });

    it('calls onNavigateTo when clicking a relationship badge link', async () => {
      const onNavigateTo = jest.fn();
      const checkoutFeatureKI = makeFeatureKI({ ...baseFeature });
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={baseFeature}
          allKnowledgeIndicators={[checkoutFeatureKI, paymentKI, depKI]}
          onNavigateTo={onNavigateTo}
        />
      );

      await userEvent.click(screen.getByText('Depends on'));
      expect(onNavigateTo).toHaveBeenCalledWith(depKI);
    });

    it('renders dependency KI name as plain text without onNavigateTo', () => {
      const checkoutFeatureKI = makeFeatureKI({ ...baseFeature });
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={baseFeature}
          allKnowledgeIndicators={[checkoutFeatureKI, paymentKI, depKI]}
        />
      );

      const paymentText = screen.getByText('Payment Service');
      expect(paymentText.closest('a')).not.toBeInTheDocument();
    });
  });

  describe('navigable properties', () => {
    it('renders source/target property values as links when KI is found', async () => {
      const depFeature = makeFeature({
        id: 'dep-1',
        type: DEPENDENCY_FEATURE_TYPE,
        properties: { source: 'checkout', target: 'payment' },
      });
      const checkoutKI = makeFeatureKI({
        id: 'checkout-service',
        type: 'entity',
        title: 'Checkout Service',
      });
      const paymentKI = makeFeatureKI({
        id: 'payment-service',
        type: 'entity',
        title: 'Payment Service',
      });
      const onNavigateTo = jest.fn();

      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={depFeature}
          allKnowledgeIndicators={[checkoutKI, paymentKI]}
          onNavigateTo={onNavigateTo}
        />
      );

      await userEvent.click(screen.getByText('checkout'));
      expect(onNavigateTo).toHaveBeenCalledWith(checkoutKI);
    });

    it('renders non-ref property values as plain text', () => {
      const feature = makeFeature({
        id: 'test',
        type: 'entity',
        properties: { region: 'us-east-1' },
      });
      renderWithProviders(
        <KnowledgeIndicatorFeatureDetailsContent
          feature={feature}
          allKnowledgeIndicators={[]}
          onNavigateTo={jest.fn()}
        />
      );

      const regionText = screen.getByText('us-east-1');
      expect(regionText.closest('a')).not.toBeInTheDocument();
    });
  });
});
