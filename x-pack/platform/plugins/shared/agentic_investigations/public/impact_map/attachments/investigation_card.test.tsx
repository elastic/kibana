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
import { InvestigationCard } from './investigation_card';

const renderCard = (defaultOpen?: boolean) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <InvestigationCard title="Checkout" icon="warning" defaultOpen={defaultOpen}>
          <div data-test-subj="body">Body</div>
        </InvestigationCard>
      </EuiProvider>
    </I18nProvider>
  );

describe('InvestigationCard', () => {
  it('starts unfolded unless told otherwise', () => {
    renderCard();

    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('starts folded when defaultOpen is false, and unfolds on a click', () => {
    renderCard(false);

    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agenticInvestigationsCardCollapse'));
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });
});
