/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { AiIndexCard } from './ai_index_card';
import { AI_INDEX_TYPE_LABEL } from './labels';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

const renderAiIndexCard = (
  aiIndex: AiIndexHttpItem,
  href = '/app/context_engine/ai_index/my-ai-index'
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AiIndexCard aiIndex={aiIndex} href={href} />
      </EuiProvider>
    </I18nProvider>
  );

describe('AiIndexCard', () => {
  it('renders the AI index id as the card title and links to the given href', () => {
    renderAiIndexCard(
      buildAiIndex({ id: 'support-tickets' }),
      '/app/context_engine/ai_index/support-tickets'
    );

    const link = screen.getByRole('link', { name: /support-tickets/ });
    expect(link).toHaveAttribute('href', '/app/context_engine/ai_index/support-tickets');
    expect(screen.getByTestId('contextAiIndexCard')).toBeInTheDocument();
  });

  it.each([
    ['index', 'index' as const],
    ['data_stream', 'data_stream' as const],
  ])('renders the type label for dest type %s', (_label, destType) => {
    renderAiIndexCard(
      buildAiIndex({
        id: 'typed-index',
        dest: { type: destType, value: 'backing-store' },
      })
    );

    expect(screen.getByTestId('contextAiIndexCardType')).toHaveTextContent(
      AI_INDEX_TYPE_LABEL[destType]
    );
  });

  it('renders the description', () => {
    renderAiIndexCard(buildAiIndex({ description: 'Escalation playbooks for support' }));

    expect(screen.getByTestId('contextAiIndexCardDescription')).toHaveTextContent(
      'Escalation playbooks for support'
    );
  });

  describe('source and automation counts', () => {
    it.each([
      [0, '0 sources'],
      [1, '1 source'],
      [2, '2 sources'],
    ])('pluralizes %i sources correctly', (count, expected) => {
      renderAiIndexCard(
        buildAiIndex({
          sources: Array.from({ length: count }, (_, index) => ({
            type: 'esql' as const,
            value: `FROM logs-${index}`,
          })),
        })
      );

      expect(screen.getByTestId('contextAiIndexCardSources')).toHaveTextContent(expected);
    });

    it.each([
      [0, '0 automations'],
      [1, '1 automation'],
      [2, '2 automations'],
    ])('pluralizes %i automations correctly', (count, expected) => {
      renderAiIndexCard(
        buildAiIndex({
          automations: Array.from({ length: count }, (_, index) => ({
            type: 'workflow' as const,
            value: `workflow-${index}`,
          })),
        })
      );

      expect(screen.getByTestId('contextAiIndexCardAutomations')).toHaveTextContent(expected);
    });
  });

  it('shows the managed badge and hides the updated footer when managed is true', () => {
    renderAiIndexCard(buildAiIndex({ managed: true }));

    expect(screen.getByTestId('contextAiIndexCardManaged')).toHaveTextContent('Managed');
    expect(screen.queryByTestId('contextAiIndexCardUpdated')).not.toBeInTheDocument();
  });

  it('shows the updated footer and no managed badge when managed is false', () => {
    renderAiIndexCard(buildAiIndex({ managed: false }));

    expect(screen.getByTestId('contextAiIndexCardUpdated')).toHaveTextContent('Updated');
    expect(screen.queryByTestId('contextAiIndexCardManaged')).not.toBeInTheDocument();
  });
});
