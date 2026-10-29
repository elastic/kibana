/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ESQLLangEditor } from '@kbn/esql/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { EsqlEventAnnotationConfig } from '@kbn/event-annotation-common';
import { EsqlAnnotationControls } from './esql_annotation_controls';

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: (props: React.ComponentProps<typeof ESQLLangEditor>) => {
    const controllerRef = React.useRef<AbortController>();
    return (
      <>
        <textarea
          aria-label="Query"
          value={props.query.esql}
          onChange={(event) => props.onTextLangQueryChange({ esql: event.target.value })}
        />
        <button
          onClick={() => {
            controllerRef.current = new AbortController();
            props.onTextLangQuerySubmit(props.query, controllerRef.current);
          }}
        >
          Run
        </button>
        <button onClick={() => controllerRef.current?.abort()}>Cancel</button>
        {props.isLoading && <span>Loading</span>}
        {props.errors?.map((error) => (
          <span role="alert" key={error.message}>
            {error.message}
          </span>
        ))}
      </>
    );
  },
}));

interface FetchResult {
  columns: DatatableColumn[];
  timeField?: string;
}

const columns: DatatableColumn[] = [
  { id: 'time-id', name: 'time', meta: { type: 'date' } },
  { id: 'version-id', name: 'version', meta: { type: 'string' } },
];
const annotation: EsqlEventAnnotationConfig = {
  id: 'deployments',
  type: 'esql',
  query: { esql: 'FROM deployments | KEEP time, version' },
  key: { type: 'point_in_time' },
  timeColumn: 'time',
  textColumn: 'version',
  label: 'Deployments',
  color: '#FF0000',
  lineWidth: 3,
};
const nextQuery = 'FROM deployments | WHERE version IS NOT NULL | KEEP time, version';

const submitQuery = () => {
  fireEvent.change(screen.getByLabelText('Query'), { target: { value: nextQuery } });
  fireEvent.click(screen.getByText('Run'));
};

const renderControls = () => {
  const fetchColumns = jest
    .fn<Promise<FetchResult>, [typeof annotation.query, AbortSignal]>()
    .mockResolvedValue({ columns, timeField: '@timestamp' });
  const onChange = jest.fn();
  const props = { annotation, onChange, fetchColumns };
  const rendered = render(<EsqlAnnotationControls {...props} />);
  return { ...rendered, props, fetchColumns, onChange };
};

describe('EsqlAnnotationControls', () => {
  it('loads saved query columns without resubmitting annotation state', async () => {
    const { fetchColumns, onChange } = renderControls();

    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());

    expect(fetchColumns).toHaveBeenCalledWith(annotation.query, expect.any(AbortSignal));
    expect(
      within(screen.getByLabelText('Text column')).getByRole('option', { name: 'version' })
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits a submitted query only after success and preserves edits made while loading', async () => {
    const { props, fetchColumns, onChange, rerender } = renderControls();
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
    let resolveColumns = (result: FetchResult) => {};
    fetchColumns.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveColumns = resolve;
        })
    );

    submitQuery();
    expect(onChange).not.toHaveBeenCalled();
    rerender(
      <EsqlAnnotationControls {...props} annotation={{ ...annotation, label: 'New label' }} />
    );
    await act(async () => resolveColumns({ columns, timeField: '@timestamp' }));

    expect(onChange).toHaveBeenCalledWith({
      ...annotation,
      label: 'New label',
      query: { esql: nextQuery },
      timeField: '@timestamp',
    });
  });

  it('keeps the last accepted configuration and columns when a submitted query fails', async () => {
    const { fetchColumns, onChange } = renderControls();
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
    fetchColumns.mockRejectedValueOnce(new Error('Invalid query'));

    submitQuery();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid query');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Time column')).toHaveValue('time');
    expect(
      within(screen.getByLabelText('Text column')).getByRole('option', { name: 'version' })
    ).toBeInTheDocument();
  });

  it('does not commit a cancelled query even if its request resolves', async () => {
    const { fetchColumns, onChange } = renderControls();
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
    let resolveColumns = (result: FetchResult) => {};
    fetchColumns.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveColumns = resolve;
        })
    );

    submitQuery();
    fireEvent.click(screen.getByText('Cancel'));
    expect(fetchColumns.mock.calls[1][1].aborted).toBe(true);
    await act(async () => resolveColumns({ columns, timeField: '@timestamp' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('refreshes columns after fetch-context changes without overwriting an unsubmitted draft', async () => {
    const { props, rerender } = renderControls();
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Query'), { target: { value: nextQuery } });
    const fetchColumns = jest.fn().mockResolvedValue({ columns, timeField: '@timestamp' });

    rerender(<EsqlAnnotationControls {...props} fetchColumns={fetchColumns} />);
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());

    expect(fetchColumns).toHaveBeenCalledWith(annotation.query, expect.any(AbortSignal));
    expect(screen.getByLabelText('Query')).toHaveValue(nextQuery);
  });

  it('aborts metadata requests when the annotation editor unmounts', () => {
    const fetchColumns = jest
      .fn<Promise<FetchResult>, [typeof annotation.query, AbortSignal]>()
      .mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(
      <EsqlAnnotationControls
        annotation={annotation}
        onChange={jest.fn()}
        fetchColumns={fetchColumns}
      />
    );

    unmount();

    expect(fetchColumns.mock.calls[0][1].aborted).toBe(true);
  });
});
