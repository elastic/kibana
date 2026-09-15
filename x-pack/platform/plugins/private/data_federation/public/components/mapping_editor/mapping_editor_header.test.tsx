/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { MappingEditorHeader } from './mapping_editor_header';

describe('MappingEditorHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: React.ComponentProps<typeof MappingEditorHeader>) => {
    return render(
      <I18nProvider>
        <EuiProvider>
          <MappingEditorHeader />
        </EuiProvider>
      </I18nProvider>
    );
  };

  it('renders the title and recommendation text', () => {
    const { getByText } = renderComponent({});

    expect(getByText('Mapped fields')).toBeInTheDocument();
    expect(getByText('@timestamp')).toBeInTheDocument();
  });

  // Search field intentionally removed
});
