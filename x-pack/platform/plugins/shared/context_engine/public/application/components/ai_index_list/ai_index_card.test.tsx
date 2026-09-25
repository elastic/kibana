/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { AiIndexCard } from './ai_index_card';
import { AI_INDEX_TYPE_LABEL } from './labels';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

const renderAiIndexCard = (
  aiIndex: AiIndexHttpItem,
  href = '/app/context_engine/ai_index/my-ai-index',
  onDeleteClick = jest.fn()
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AiIndexCard aiIndex={aiIndex} href={href} onDeleteClick={onDeleteClick} />
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
    expect(link).toHaveAttribute(
      'data-ebt-element',
      CONTEXT_ENGINE_UI_EBT.element.aiIndexListPageCard
    );
    expect(link).toHaveAttribute(
      'data-ebt-action',
      CONTEXT_ENGINE_UI_EBT.action.aiIndexList.OPEN_CARD
    );
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

  // `1fr` grid tracks size to the card's min-content width, so an unbreakable id stretches the grid.
  it('keeps a long id breakable and clamped to one line', () => {
    const id = 'a'.repeat(256);

    renderAiIndexCard(buildAiIndex({ id }));

    const title = screen.getByTestId('contextAiIndexCardTitle');
    expect(title).toHaveClass('euiTextBlockTruncate', 'eui-textBreakWord');
    // The clamp hides most of a long id, so the full value stays reachable on hover.
    expect(title).toHaveAttribute('title', id);
  });

  it('keeps a long description breakable', () => {
    renderAiIndexCard(buildAiIndex({ description: `See https://example.com/${'x'.repeat(200)}` }));

    expect(screen.getByTestId('contextAiIndexCardDescription').firstElementChild).toHaveClass(
      'euiTextBlockTruncate',
      'eui-textBreakWord'
    );
  });

  it('renders the description', () => {
    renderAiIndexCard(buildAiIndex({ description: 'Escalation playbooks for support' }));

    expect(screen.getByTestId('contextAiIndexCardDescription')).toHaveTextContent(
      'Escalation playbooks for support'
    );
  });

  it('omits the description block when there is no description', () => {
    renderAiIndexCard(buildAiIndex({ description: undefined }));

    expect(screen.queryByTestId('contextAiIndexCardDescription')).not.toBeInTheDocument();
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

  it('calls onDeleteClick when the delete action is selected', () => {
    const onDeleteClick = jest.fn();
    renderAiIndexCard(buildAiIndex({ managed: false }), undefined, onDeleteClick);

    const actionsButton = screen.getByTestId('contextAiIndexCardActionsButton');
    expect(actionsButton).toHaveAttribute(
      'data-ebt-element',
      CONTEXT_ENGINE_UI_EBT.element.aiIndexListPageCard
    );
    expect(actionsButton).toHaveAttribute(
      'data-ebt-action',
      CONTEXT_ENGINE_UI_EBT.action.aiIndexList.CARD_ACTIONS_MENU
    );

    fireEvent.click(actionsButton);

    const deleteAction = screen.getByTestId('contextAiIndexCardDeleteAction');
    expect(deleteAction).toHaveAttribute(
      'data-ebt-element',
      CONTEXT_ENGINE_UI_EBT.element.aiIndexListPageCard
    );
    expect(deleteAction).toHaveAttribute(
      'data-ebt-action',
      CONTEXT_ENGINE_UI_EBT.action.aiIndexList.DELETE
    );
    fireEvent.click(deleteAction);

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('shows a tooltip explaining why the delete action is disabled for managed indices', async () => {
    renderAiIndexCard(buildAiIndex({ managed: true }));

    fireEvent.click(screen.getByTestId('contextAiIndexCardActionsButton'));
    const deleteAction = screen.getByTestId('contextAiIndexCardDeleteAction');
    expect(deleteAction).toHaveAttribute('aria-disabled', 'true');
    fireEvent.mouseOver(deleteAction.parentElement ?? deleteAction);

    expect(
      await screen.findByText('This AI index is managed and cannot be deleted.')
    ).toBeInTheDocument();
  });
});
