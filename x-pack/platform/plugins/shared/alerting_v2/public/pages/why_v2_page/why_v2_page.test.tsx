/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { WhyV2Page } from './why_v2_page';
import { getWhyV2DocLinks } from '../../content/why_v2_doc_links';
import {
  WHY_V2_HIGHLIGHTS,
  WHY_V2_SPOTLIGHTS,
} from '../../content/why_v2_features';

const mockDocLinks = {
  alerting: {
    guide: 'https://docs.example.com/alerting-guide',
    esQuery: 'https://docs.example.com/es-query',
    connectors: 'https://docs.example.com/connectors',
  },
  query: {
    queryESQL: 'https://docs.example.com/esql',
  },
};

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('../../hooks/use_compose_discover_flyout', () => ({
  useComposeDiscoverFlyout: () => ({
    flyout: null,
    openCreateFlyout: jest.fn(),
    openCreateBuilderFlyout: jest.fn(),
    openEditFlyout: jest.fn(),
    openCloneFlyout: jest.fn(),
  }),
}));

jest.mock('../../hooks/use_navigate_to_agent_builder', () => ({
  useNavigateToAgentBuilder: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) => {
    if (token === 'chrome') {
      return { docTitle: { change: jest.fn() } };
    }
    if (token === 'application') {
      return { navigateToUrl: jest.fn() };
    }
    if (token === 'http') {
      return { basePath: { prepend: (path: string) => path } };
    }
    if (token === 'docLinks') {
      return { links: mockDocLinks };
    }
    return {};
  },
}));

const renderPage = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <WhyV2Page />
      </EuiProvider>
    </I18nProvider>
  );

describe('WhyV2Page', () => {
  it('renders hero, highlights, spotlights, quick start, comparison, and markdown', () => {
    renderPage();

    expect(screen.getByTestId('whyV2Page')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2Hero')).toHaveTextContent('Why Alerting v2.0');
    expect(screen.getByTestId('whyV2Highlights')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2Comparison')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2ComparisonToggle')).toHaveTextContent(
      'See how Alerting v2 compares to v1'
    );
    expect(screen.queryByTestId('whyV2ComparisonTable')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('whyV2ComparisonToggle'));
    expect(screen.getByTestId('whyV2ComparisonTable')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2Spotlights')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2QuickStart')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2DynamicMarkdown')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2TerminalWindow')).toBeInTheDocument();
    expect(screen.getByTestId('whyV2MarkdownSource')).toHaveTextContent('bundled · placeholder');
    expect(screen.getByTestId('whyV2DocsFooter')).toBeInTheDocument();
    getWhyV2DocLinks(mockDocLinks).forEach((item) => {
      expect(screen.getByTestId(item.dataTestSubj)).toBeInTheDocument();
      expect(screen.getByTestId(`${item.dataTestSubj}-link`)).toHaveAttribute('href', item.href);
    });

    WHY_V2_HIGHLIGHTS.forEach((item) => {
      expect(screen.getByTestId(`whyV2Highlight-${item.id}`)).toBeInTheDocument();
    });

    WHY_V2_SPOTLIGHTS.forEach((spotlight) => {
      expect(screen.getByTestId(`whyV2Spotlight-${spotlight.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`whyV2SpotlightIllustration-${spotlight.id}`)).toBeInTheDocument();
    });

    expect(screen.getByTestId('createEsqlRuleCard')).toBeInTheDocument();
    expect(screen.getByTestId('createWithAgentCard')).toBeInTheDocument();
  });
});
