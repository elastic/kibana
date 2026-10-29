/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IMPORT_STATUSES } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { IMPORT_STATUS_META, IMPORT_STATUS_ORDER, ImportStatusHealth } from './import_status';

describe('import status mapping', () => {
  it('covers every status the server can return', () => {
    expect(Object.keys(IMPORT_STATUS_META).sort()).toEqual([...IMPORT_STATUSES].sort());
    expect([...IMPORT_STATUS_ORDER].sort()).toEqual([...IMPORT_STATUSES].sort());
  });

  it.each([
    ['receiving', 'Receiving', 'success'],
    ['waiting', 'Waiting for first alert', 'subdued'],
    ['idle', 'Idle', 'warning'],
    ['failing', 'Failing', 'danger'],
    ['disabled', 'Disabled', 'subdued'],
    ['connector_missing', 'Connector missing', 'warning'],
    ['workflow_missing', 'Workflow missing', 'warning'],
  ] as const)('maps %s to "%s" with the %s color', (status, label, color) => {
    expect(IMPORT_STATUS_META[status]).toEqual(expect.objectContaining({ label, color }));
  });

  it('renders the label', () => {
    render(
      <I18nProvider>
        <ImportStatusHealth status="failing" />
      </I18nProvider>
    );

    expect(screen.getByTestId('importsStatus-failing')).toHaveTextContent('Failing');
  });
});
