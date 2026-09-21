/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowConnectorIcons } from './workflow_connector_icons';

const renderIcons = (types: string[]) =>
  render(
    <I18nProvider>
      <WorkflowConnectorIcons types={types} />
    </I18nProvider>
  );

describe('WorkflowConnectorIcons', () => {
  it('renders one flex item per distinct connector type', () => {
    renderIcons(['email', 'slack', 'elasticsearch']);

    const group = screen.getByTestId('workflowConnectorIcons');
    expect(group).toBeInTheDocument();
    expect(group.children.length).toBe(3);
  });

  it('caps at 4 visible icons and shows +N for the rest', () => {
    renderIcons(['elasticsearch', 'email', 'slack', 'kibana', 'http', 'pagerduty']);

    const group = screen.getByTestId('workflowConnectorIcons');
    // 4 visible + 1 overflow flex item
    expect(group.children.length).toBe(5);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders nothing when types is empty', () => {
    const { container } = renderIcons([]);
    expect(container).toBeEmptyDOMElement();
  });
});
