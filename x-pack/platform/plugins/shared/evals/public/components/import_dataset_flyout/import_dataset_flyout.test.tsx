/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MAX_EXAMPLES_PER_DATASET } from '@kbn/evals-common';
import { useAddExamples, useCreateDataset, useDatasets } from '../../hooks/use_evals_api';
import { ImportDatasetFlyout } from './import_dataset_flyout';

jest.mock('../../hooks/use_evals_api');

const mockedUseDatasets = jest.mocked(useDatasets);
const mockedUseCreateDataset = jest.mocked(useCreateDataset);
const mockedUseAddExamples = jest.mocked(useAddExamples);

const mutationResult = {
  mutateAsync: jest.fn(),
  isLoading: false,
};

const createFile = (name: string, contents: Promise<string> | string): File => {
  const file = new File(['file'], name);
  Object.defineProperty(file, 'text', {
    value: jest.fn().mockReturnValue(Promise.resolve(contents)),
  });
  return file;
};

const selectFile = (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('File input not found');
  }
  const files = {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
  } as unknown as FileList;
  fireEvent.change(input, { target: { files } });
};

const renderFlyout = (examplesCount = 0) =>
  render(
    <ImportDatasetFlyout
      initialDataset={{ id: 'dataset-1', name: 'Dataset one', examplesCount }}
      onClose={jest.fn()}
    />
  );

describe('ImportDatasetFlyout', () => {
  beforeEach(() => {
    mockedUseDatasets.mockReturnValue({
      data: { datasets: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useDatasets>);
    mockedUseCreateDataset.mockReturnValue(
      mutationResult as unknown as ReturnType<typeof useCreateDataset>
    );
    mockedUseAddExamples.mockReturnValue(
      mutationResult as unknown as ReturnType<typeof useAddExamples>
    );
  });

  it('shows parser diagnostics when a file has no valid rows', async () => {
    renderFlyout();

    selectFile(createFile('invalid.jsonl', 'not json'));

    expect(await screen.findByText(/Row 1:/)).toBeInTheDocument();
    expect(
      screen.queryByText('The selected file does not contain any data rows.')
    ).not.toBeInTheDocument();
  });

  it('uses the empty-file message when parsing produces no row errors', async () => {
    renderFlyout();

    selectFile(createFile('empty.jsonl', '\n'));

    expect(
      await screen.findByText('The selected file does not contain any data rows.')
    ).toBeInTheDocument();
  });

  it('blocks an import that would exceed the dataset capacity', async () => {
    renderFlyout(MAX_EXAMPLES_PER_DATASET);
    selectFile(createFile('examples.csv', 'question\nWhy?'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/A dataset can contain at most/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 1 example' })).toBeDisabled();
  });

  it('ignores a stale file read after a newer selection completes', async () => {
    let resolveFirstFile: (contents: string) => void = () => {};
    const firstContents = new Promise<string>((resolve) => {
      resolveFirstFile = resolve;
    });
    renderFlyout();

    selectFile(createFile('first.jsonl', firstContents));
    selectFile(createFile('second.jsonl', '{"newer":"value"}'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());

    await act(async () => resolveFirstFile('{"stale":"value"}'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getAllByText('newer').length).toBeGreaterThan(0);
    expect(screen.queryByText('stale')).not.toBeInTheDocument();
  });
});
