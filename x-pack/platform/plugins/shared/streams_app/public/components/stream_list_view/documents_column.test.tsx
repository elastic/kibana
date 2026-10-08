/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { DocumentsColumn } from './documents_column';

const renderColumn = (
  histogramQueryFetch: Promise<UnparsedEsqlResponse>,
  retainHistogramQueryFetch: jest.Mock
) =>
  render(
    <EuiProvider>
      <DocumentsColumn
        indexPattern="logs-a"
        histogramQueryFetch={histogramQueryFetch}
        retainHistogramQueryFetch={retainHistogramQueryFetch}
        timeState={{ start: 0, end: 3_600_000 } as never}
        numDataPoints={25}
      />
    </EuiProvider>
  );

describe('DocumentsColumn', () => {
  it('retains its histogram while mounted and releases it on unmount', () => {
    const release = jest.fn();
    const retain = jest.fn().mockReturnValue(release);
    const histogramQueryFetch = new Promise<UnparsedEsqlResponse>(() => {});

    const { unmount } = renderColumn(histogramQueryFetch, retain);

    expect(retain).toHaveBeenCalledTimes(1);
    expect(retain).toHaveBeenCalledWith(histogramQueryFetch);
    expect(release).not.toHaveBeenCalled();

    unmount();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the previous histogram when it receives a new one', () => {
    const releaseFirst = jest.fn();
    const retain = jest.fn().mockReturnValueOnce(releaseFirst).mockReturnValue(jest.fn());
    const firstFetch = new Promise<UnparsedEsqlResponse>(() => {});
    const secondFetch = new Promise<UnparsedEsqlResponse>(() => {});

    const { rerender } = renderColumn(firstFetch, retain);
    rerender(
      <EuiProvider>
        <DocumentsColumn
          indexPattern="logs-a"
          histogramQueryFetch={secondFetch}
          retainHistogramQueryFetch={retain}
          timeState={{ start: 0, end: 3_600_000 } as never}
          numDataPoints={25}
        />
      </EuiProvider>
    );

    expect(releaseFirst).toHaveBeenCalledTimes(1);
    expect(retain).toHaveBeenLastCalledWith(secondFetch);
  });
});
