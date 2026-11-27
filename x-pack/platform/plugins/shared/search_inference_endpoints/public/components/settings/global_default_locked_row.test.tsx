/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { GlobalDefaultLockedRow } from './global_default_locked_row';
import { EisModelStatus, type EndpointDeprecationInfo } from '../../types';

describe('GlobalDefaultLockedRow', () => {
  const renderRow = ({
    showBadge = true,
    deprecationInfo,
  }: Partial<{ showBadge: boolean; deprecationInfo: EndpointDeprecationInfo }> = {}) =>
    render(
      <EuiThemeProvider>
        <I18nProvider>
          <GlobalDefaultLockedRow
            featureId="test_feature"
            icon="logoOpenAI"
            label="GPT-4o"
            showBadge={showBadge}
            globalDefaultId="ep-3"
            deprecationInfo={deprecationInfo}
          />
        </I18nProvider>
      </EuiThemeProvider>
    );

  it('renders the Global default badge', () => {
    renderRow();

    expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
    expect(screen.getByTestId('global-default-badge-test_feature')).toHaveTextContent(
      'Global default'
    );
  });

  it('hides the Global default badge but keeps the row', () => {
    renderRow({ showBadge: false });

    expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
    expect(screen.queryByTestId('global-default-badge-test_feature')).not.toBeInTheDocument();
  });

  it('renders the deprecated badge for a deprecated global default model', () => {
    renderRow({
      deprecationInfo: {
        name: 'GPT-4o',
        status: EisModelStatus.Deprecated,
        metadata: {
          heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' },
        },
      },
    });

    expect(screen.getByTestId('modelDeprecatedBadge-ep-3')).toBeInTheDocument();
  });
});
