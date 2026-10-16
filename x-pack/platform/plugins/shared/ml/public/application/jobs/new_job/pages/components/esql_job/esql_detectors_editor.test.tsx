/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlDetectorsEditor } from './esql_detectors_editor';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';

const columns: ESQLFieldWithMetadata[] = [
  { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
  { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
  { name: 'region', type: 'keyword', hasConflict: false, userDefined: false },
  { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
];

const renderEditor = (detectors: EsqlDetectorConfig[], onChange = jest.fn()) => {
  renderWithI18n(
    <EsqlDetectorsEditor
      detectors={detectors}
      columns={columns}
      emittedTimeField="bucket"
      onChange={onChange}
    />
  );
  return onChange;
};

describe('EsqlDetectorsEditor', () => {
  it('renders by/over/partition selectors scoped to non-numeric, non-time columns', () => {
    renderEditor([{ function: 'mean', field: 'avg_bytes' }]);

    expect(screen.getByTestId('mlEsqlDetectorByField-0')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlDetectorOverField-0')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlDetectorPartitionField-0')).toBeInTheDocument();
  });

  it('sets byField on the detector when chosen', () => {
    const onChange = renderEditor([{ function: 'mean', field: 'avg_bytes' }]);

    const byFieldInput = screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')!;
    fireEvent.change(byFieldInput, { target: { value: 'host' } });
    fireEvent.keyDown(byFieldInput, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ function: 'mean', field: 'avg_bytes', byField: 'host' }),
    ]);
  });

  it('flags rare detectors without a by field as invalid, and clears once set', () => {
    renderEditor([{ function: 'rare' }]);

    expect(screen.getByTestId('mlEsqlDetectorByFieldHint-0')).toHaveTextContent(
      'rare requires a by field.'
    );
    expect(screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('does not flag freq_rare once a by field is set', () => {
    renderEditor([{ function: 'freq_rare', byField: 'host' }]);

    expect(
      screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')
    ).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('marks a column reused across by/over/partition on the same detector as a duplicate', () => {
    renderEditor([{ function: 'mean', field: 'avg_bytes', byField: 'host', overField: 'host' }]);

    expect(screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByTestId('mlEsqlDetectorOverField-0').querySelector('input')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('flags a by field that references a column no longer in the query output', () => {
    renderEditor([{ function: 'mean', field: 'avg_bytes', byField: 'removed_column' }]);

    expect(screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('flags the emitted time column when used as a partitioning field', () => {
    renderEditor([{ function: 'mean', field: 'avg_bytes', partitionField: 'bucket' }]);

    expect(
      screen.getByTestId('mlEsqlDetectorPartitionField-0').querySelector('input')
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds and removes detector rows', () => {
    const onChange = renderEditor([{ function: 'mean', field: 'avg_bytes' }]);

    fireEvent.click(screen.getByTestId('mlEsqlAddDetectorButton'));
    expect(onChange).toHaveBeenCalledWith([
      { function: 'mean', field: 'avg_bytes' },
      { function: 'mean' },
    ]);
  });

  it('does not allow removing the last remaining detector', () => {
    renderEditor([{ function: 'mean', field: 'avg_bytes' }]);

    expect(screen.getByTestId('mlEsqlRemoveDetectorButton-0')).toBeDisabled();
  });
});
