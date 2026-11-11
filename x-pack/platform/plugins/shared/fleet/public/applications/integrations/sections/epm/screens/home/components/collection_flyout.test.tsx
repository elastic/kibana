/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

import type { CollectionVariant } from '../card_utils';
import { CollectionFlyout } from './collection_flyout';

const makeVariant = (overrides: Partial<CollectionVariant> = {}): CollectionVariant => ({
  id: 'nginx',
  title: 'Nginx',
  description: 'The Nginx integration.',
  icon: <span data-test-subj="icon" />,
  href: '/app/integrations/detail/nginx-1.0/overview',
  ...overrides,
});

function renderFlyout(props: Partial<React.ComponentProps<typeof CollectionFlyout>> = {}) {
  const defaults = {
    title: 'Nginx collection',
    description: 'Choose your preferred Nginx integration.',
    variants: [makeVariant()],
    onClose: jest.fn(),
  };
  return render(
    <I18nProvider>
      <EuiThemeProvider>
        <CollectionFlyout {...defaults} {...props} />
      </EuiThemeProvider>
    </I18nProvider>
  );
}

describe('CollectionFlyout', () => {
  it('renders with data-test-subj collectionFlyout', () => {
    const { getByTestId } = renderFlyout();
    expect(getByTestId('collectionFlyout')).toBeInTheDocument();
  });

  it('renders the flyout title', () => {
    const { getByText } = renderFlyout();
    expect(getByText('Nginx collection')).toBeInTheDocument();
  });

  it('renders the flyout description', () => {
    const { getByText } = renderFlyout();
    expect(getByText('Choose your preferred Nginx integration.')).toBeInTheDocument();
  });

  it('renders a row for each variant', () => {
    const variants = [
      makeVariant({ id: 'nginx', title: 'Nginx' }),
      makeVariant({ id: 'nginx-otel', title: 'Nginx OTel' }),
    ];
    const { getByText } = renderFlyout({ variants });
    expect(getByText('Nginx')).toBeInTheDocument();
    expect(getByText('Nginx OTel')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderFlyout({ onClose });
    fireEvent.click(getByLabelText('Close this dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
