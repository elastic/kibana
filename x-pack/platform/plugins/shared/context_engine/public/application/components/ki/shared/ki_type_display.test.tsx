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
import { KiTypeDisplay } from './ki_type_display';

const renderType = (props: React.ComponentProps<typeof KiTypeDisplay>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KiTypeDisplay {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('KiTypeDisplay', () => {
  it('renders formatted type as text', () => {
    renderType({ as: 'text', type: 'custom.type', 'data-test-subj': 'kiTypeText' });
    expect(screen.getByTestId('kiTypeText')).toHaveTextContent('custom type');
  });

  it('renders None when type is missing in text mode', () => {
    renderType({ as: 'text', 'data-test-subj': 'kiTypeText' });
    expect(screen.getByTestId('kiTypeText')).toHaveTextContent('None');
  });

  it('renders a hollow badge when type is set', () => {
    renderType({ as: 'badge', type: 'playbook', 'data-test-subj': 'kiTypeBadge' });
    expect(screen.getByTestId('kiTypeBadge')).toHaveTextContent('playbook');
  });

  it('renders nothing for badge mode without type', () => {
    const { container } = renderType({ as: 'badge', 'data-test-subj': 'kiTypeBadge' });
    expect(container).toBeEmptyDOMElement();
  });
});
