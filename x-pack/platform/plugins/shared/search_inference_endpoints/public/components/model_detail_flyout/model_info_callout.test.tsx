/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ModelInfoCallout } from './model_info_callout';

const renderCallout = () =>
  render(
    <I18nProvider>
      <ModelInfoCallout />
    </I18nProvider>
  );

describe('ModelInfoCallout', () => {
  it('shows the preview message', () => {
    const { getByTestId } = renderCallout();

    expect(getByTestId('modelDetailFlyoutPreviewCallout')).toHaveTextContent(
      'Model is still in Technical Preview and not recommended for production use.'
    );
  });
});
