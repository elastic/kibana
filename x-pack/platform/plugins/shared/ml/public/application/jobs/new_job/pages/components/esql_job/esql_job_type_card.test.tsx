/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EnabledFeaturesContext } from '../../../../../contexts/ml/enabled_features_context';
import { getIsMlEsqlDatafeedEnabled } from '../../../../../services/ml_server_info';
import { EsqlJobTypeCard } from './esql_job_type_card';

jest.mock('../../../../../services/ml_server_info', () => ({
  getIsMlEsqlDatafeedEnabled: jest.fn(),
}));

const mockGetIsMlEsqlDatafeedEnabled = jest.mocked(getIsMlEsqlDatafeedEnabled);

const enabledFeatures = {
  isServerless: true,
  showLogsSuppliedConfigurationsInfo: false,
  showContextualInsights: true,
  showNodeInfo: false,
  showMLNavMenu: true,
  showLicenseInfo: false,
  isADEnabled: true,
  isDFAEnabled: true,
  isNLPEnabled: true,
  showRuleFormV2: false,
  isCPSEnabled: false,
};

const renderCard = (isServerless: boolean, onClick = jest.fn()) => {
  renderWithI18n(
    <EnabledFeaturesContext.Provider value={{ ...enabledFeatures, isServerless }}>
      <EsqlJobTypeCard onClick={onClick} />
    </EnabledFeaturesContext.Provider>
  );

  return onClick;
};

describe('EsqlJobTypeCard', () => {
  beforeEach(() => {
    mockGetIsMlEsqlDatafeedEnabled.mockReturnValue(true);
  });

  it('renders an enabled ES|QL card and invokes its callback for Serverless with capability support', () => {
    const onClick = renderCard(true);

    const card = screen.getByTestId('mlJobTypeLinkEsqlJob');
    expect(card).toHaveTextContent('ES|QL');
    expect(card).toHaveTextContent('Create an anomaly detection job with an ES|QL query.');
    expect(card).not.toHaveStyle({ pointerEvents: 'none' });

    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides the card outside Serverless', () => {
    renderCard(false);

    expect(screen.queryByTestId('mlJobTypeLinkEsqlJob')).not.toBeInTheDocument();
  });

  it('hides the card when ES|QL datafeeds are unavailable', () => {
    mockGetIsMlEsqlDatafeedEnabled.mockReturnValue(false);
    renderCard(true);

    expect(screen.queryByTestId('mlJobTypeLinkEsqlJob')).not.toBeInTheDocument();
  });

  it('does not expose the capability token in user-facing text', () => {
    renderCard(true);

    expect(screen.queryByText('ml_datafeed_esql_query')).not.toBeInTheDocument();
  });
});
