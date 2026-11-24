/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { STATS_NO_VALUE_LABEL } from '../../../services/unit_stats_client/format_stats';
import type { FailureCauseView } from '../../../services/unit_stats_client/types';
import { DestinationFailureCausesTable } from './destination_failure_causes_table';

const TABLE = 'causes';

const cause = (overrides: Partial<FailureCauseView>): FailureCauseView => ({
  collection: null,
  reason: null,
  rate: 0.5,
  unit: '{item}',
  percentage: 11.9,
  ...overrides,
});

const renderTable = (causes: FailureCauseView[], destinationType = 'elasticsearch') =>
  render(
    <DestinationFailureCausesTable
      causes={causes}
      caption="Failures"
      destinationType={destinationType}
      dataTestSubj={TABLE}
    />
  );

const headers = () => screen.getAllByRole('columnheader').map(({ textContent }) => textContent);

describe('DestinationFailureCausesTable', () => {
  it('has the collection and the error type of a cause that has them, then its percentage and rate', () => {
    renderTable([
      cause({
        collection: 'logs-generic.otel-default',
        reason: 'security_exception',
        rate: 1.9,
        percentage: 45.2,
      }),
    ]);

    expect(headers()).toEqual(['Index name', 'Error type', 'Percentage', 'Rate']);
    expect(screen.getByText('logs-generic.otel-default')).toBeInTheDocument();
    expect(screen.getByText('security_exception')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('1.9/s')).toBeInTheDocument();
  });

  it.each(['elasticsearch', 'remote_elasticsearch'])(
    'calls the collection of a %s destination an index name',
    (destinationType) => {
      renderTable([cause({ collection: 'logs-a-default' })], destinationType);

      expect(headers()).toEqual(['Index name', 'Percentage', 'Rate']);
    }
  );

  it('calls the collection of any other type of destination a collection', () => {
    renderTable([cause({ collection: 'my-bucket' })], 's3');

    expect(headers()).toEqual(['Collection', 'Percentage', 'Rate']);
  });

  it('has no collection column when no cause has a collection, as with S3', () => {
    renderTable([cause({ reason: 'SignatureDoesNotMatch' })]);

    expect(headers()).toEqual(['Error type', 'Percentage', 'Rate']);
  });

  it('has no error type column when no cause has a reason', () => {
    renderTable([cause({ collection: 'logs-generic.otel-default' })]);

    expect(headers()).toEqual(['Index name', 'Percentage', 'Rate']);
  });

  it('shows a dash for the part that a cause does not have, when another cause has it', () => {
    renderTable([
      cause({ collection: 'logs-a-default', reason: 'security_exception' }),
      cause({ collection: null, reason: 'AccessDenied' }),
    ]);

    const [, withoutCollection] = screen.getAllByRole('row').slice(1);
    expect(withoutCollection.textContent).toContain(STATS_NO_VALUE_LABEL);
    expect(withoutCollection.textContent).toContain('AccessDenied');
  });
});
