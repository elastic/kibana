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
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { ViewKiMetadataPanel } from './view_ki_metadata_panel';

const renderPanel = (document: KiDocument) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ViewKiMetadataPanel kiId="ki-1" document={document} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ViewKiMetadataPanel', () => {
  it('renders attributes section when document has non-blank attributes', () => {
    renderPanel({
      attributes: {
        region: 'us-east',
      },
    });

    expect(screen.getByTestId('contextViewKiAttributesSection')).toBeInTheDocument();
  });

  it('omits attributes section when attributes are empty', () => {
    renderPanel({ attributes: {} });

    expect(screen.queryByTestId('contextViewKiAttributesSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiMetadataPanel')).toBeInTheDocument();
  });

  it('omits attributes section when all attribute values are blank', () => {
    renderPanel({
      attributes: {
        '': 'value',
        keyOnly: '   ',
      },
    });

    expect(screen.queryByTestId('contextViewKiAttributesSection')).not.toBeInTheDocument();
  });
});
