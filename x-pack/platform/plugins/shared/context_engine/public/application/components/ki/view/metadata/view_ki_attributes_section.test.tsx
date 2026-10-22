/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { ViewKiAttributesSection } from './view_ki_attributes_section';

const renderSection = (document: KiDocument) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ViewKiAttributesSection document={document} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ViewKiAttributesSection', () => {
  it('renders attribute rows from document attributes', () => {
    renderSection({
      attributes: {
        region: 'us-east',
        tier: 'gold',
        blank: '   ',
      },
    });

    const list = screen.getByTestId('contextViewKiAttributesList');
    expect(within(list).getByText('region')).toBeInTheDocument();
    expect(within(list).getByText('us-east')).toBeInTheDocument();
    expect(within(list).getByText('tier')).toBeInTheDocument();
    expect(within(list).getByText('gold')).toBeInTheDocument();
    expect(within(list).getByText('blank')).toBeInTheDocument();
  });

  it('renders nothing when there are no attributes', () => {
    const { container } = renderSection({});

    expect(screen.queryByTestId('contextViewKiAttributesSection')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders rows for whitespace-only attribute values', () => {
    renderSection({
      attributes: {
        '': 'x',
        onlySpaces: '  ',
      },
    });

    expect(screen.getByTestId('contextViewKiAttributesSection')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiAttributesList')).toBeInTheDocument();
    expect(screen.getByText('onlySpaces')).toBeInTheDocument();
  });
});
