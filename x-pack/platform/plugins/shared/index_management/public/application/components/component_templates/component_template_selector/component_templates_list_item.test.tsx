/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { ComponentTemplateListItem } from '../../../../../common';
import { ComponentTemplatesListItem } from './component_templates_list_item';

const baseComponent: ComponentTemplateListItem = {
  name: 'my_component',
  usedBy: [],
  hasMappings: true,
  hasAliases: false,
  hasSettings: false,
  isManaged: false,
};

const renderItem = (props: Partial<React.ComponentProps<typeof ComponentTemplatesListItem>> = {}) =>
  render(
    <I18nProvider>
      <ComponentTemplatesListItem
        component={baseComponent}
        onViewDetail={jest.fn()}
        actions={[{ label: 'Select', icon: 'plusCircle', handler: jest.fn() }]}
        {...props}
      />
    </I18nProvider>
  );

describe('ComponentTemplatesListItem', () => {
  it('renders the select action when not disabled', () => {
    renderItem();
    expect(screen.getByTestId('action-plusCircle')).toBeInTheDocument();
  });

  it('gives a disabled look (no + button, non-clickable name, tooltip) when the template has a frozen/delete phase and the index template does not create a data stream', () => {
    const handler = jest.fn();
    renderItem({
      component: {
        ...baseComponent,
        hasMappings: true,
        hasSettings: true,
        hasAliases: true,
        hasFrozenOrDeletePhase: true,
      },
      actions: [{ label: 'Select', icon: 'plusCircle', handler }],
      createsDataStream: false,
    });

    // Select (+) action should not be rendered when disabled
    expect(screen.queryByTestId('action-plusCircle')).not.toBeInTheDocument();

    // The name link is rendered but disabled (not clickable)
    const link = screen.getByRole('button', { name: 'my_component' });
    expect(link).toBeDisabled();

    // Content indicator badges (M/S/A) are still rendered
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();

    // The explanatory tooltip wrapper is present
    expect(screen.getByTestId('disabledReasonTooltip')).toBeInTheDocument();
  });

  it('does not disable when the template has a frozen/delete phase but the index template creates a data stream', () => {
    renderItem({
      component: { ...baseComponent, hasFrozenOrDeletePhase: true },
      createsDataStream: true,
    });
    expect(screen.getByTestId('action-plusCircle')).toBeInTheDocument();
  });

  it('does not disable when the template has no frozen/delete phase', () => {
    renderItem({
      component: { ...baseComponent, hasFrozenOrDeletePhase: false },
      createsDataStream: false,
    });
    expect(screen.getByTestId('action-plusCircle')).toBeInTheDocument();
  });
});
