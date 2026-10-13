/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { KiRow } from './ki_row';

const mockNavigateToContextEngine = jest.fn();

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    navigateToContextEngine: mockNavigateToContextEngine,
  }),
}));

const ki: KiListItem = {
  id: 'ki-1',
  index: 'ai-index-idx-sample-ki',
  type: 'playbook',
  title: 'Verify the order, check the SLA window, then issue store credit.',
};

const renderKiRow = () => {
  const services = coreMock.createStart();

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <KiRow aiIndexId="sample-ki" ki={ki} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('KiRow', () => {
  beforeEach(() => {
    mockNavigateToContextEngine.mockClear();
  });

  it('renders the title and type', () => {
    renderKiRow();

    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent(
      'Verify the order, check the SLA window, then issue store credit.'
    );
    expect(screen.getByTestId('contextKiRowType')).toHaveTextContent('Playbook');
  });

  it('renders None when type or title is missing', () => {
    const services = coreMock.createStart();

    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <KiRow aiIndexId="sample-ki" ki={{ id: 'ki-1', index: 'ai-index-idx-sample-ki' }} />
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('None');
    expect(screen.getByTestId('contextKiRowType')).toHaveTextContent('None');
  });

  it('navigates to the view page when clicked', () => {
    renderKiRow();

    fireEvent.click(screen.getByTestId('contextKiRow'));

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith('/ai_index/sample-ki/ki/ki-1', {
      index: 'ai-index-idx-sample-ki',
    });
  });
});
