/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import type { RunQuery } from '../data/data_layer';
import { renderApp } from '../components/test_utils';

const mockRun = jest.fn();
jest.mock('../services', () => ({
  getServices: () => ({ core: { http: {} }, search: jest.fn() }),
}));
jest.mock('../data/run_esql_query', () => ({
  createRunEsqlQuery:
    () =>
    (...args: unknown[]) =>
      mockRun(...args),
}));
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (next: { esql: string }) => void;
  }) => (
    <textarea
      aria-label="ES|QL query"
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

const documentWith = (node: Record<string, unknown>, state: Record<string, unknown> = {}) =>
  appDocumentSchema.parse({ state, root: node }) as AppDocument;

const noRunQuery: RunQuery = async () => ({ columns: [], rows: [] });

describe('the ES|QL editor', () => {
  beforeEach(() => mockRun.mockReset());

  it('starts with the query of the document and runs nothing until it is asked to', async () => {
    await renderApp(
      documentWith({ type: 'esql_editor', id: 'explore', title: 'Explore', query: 'FROM a' }),
      noRunQuery
    );

    expect(await screen.findByRole('textbox', { name: 'ES|QL query' })).toHaveValue('FROM a');
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('runs what is written, as the person who looks, with the period and the values of the app', async () => {
    mockRun.mockResolvedValue({
      columns: [{ name: 'host', type: 'keyword' }],
      rows: [['web-1'], ['web-2']],
    });
    await renderApp(
      documentWith(
        { type: 'esql_editor', id: 'explore', query: 'FROM a' },
        { region: { type: 'string', default: 'eu' } }
      ),
      noRunQuery
    );

    await userEvent.click(await screen.findByTestId('customAppEsqlEditorRun'));

    expect(await screen.findByText('web-2')).toBeInTheDocument();
    expect(mockRun).toHaveBeenCalledWith(
      'FROM a',
      expect.objectContaining({
        context: expect.objectContaining({ timeRange: { from: 'now-15m', to: 'now' } }),
        state: { region: 'eu' },
      }),
      expect.any(AbortSignal)
    );
  });

  it('runs what was typed, not what the document started with', async () => {
    mockRun.mockResolvedValue({ columns: [], rows: [] });
    await renderApp(
      documentWith({ type: 'esql_editor', id: 'explore', query: 'FROM a' }),
      noRunQuery
    );

    const editor = await screen.findByRole('textbox', { name: 'ES|QL query' });
    await userEvent.clear(editor);
    await userEvent.type(editor, 'FROM b');
    await userEvent.click(screen.getByTestId('customAppEsqlEditorRun'));

    await waitFor(() =>
      expect(mockRun).toHaveBeenCalledWith('FROM b', expect.anything(), expect.anything())
    );
    expect(await screen.findByText('The query returned no rows.')).toBeInTheDocument();
  });

  it('says why a query could not run', async () => {
    mockRun.mockRejectedValue(new Error('Unknown index [nope]'));
    await renderApp(
      documentWith({ type: 'esql_editor', id: 'explore', query: 'FROM nope' }),
      noRunQuery
    );

    await userEvent.click(await screen.findByTestId('customAppEsqlEditorRun'));

    expect(await screen.findByText('Unknown index [nope]')).toBeInTheDocument();
    expect(screen.getByText('The query could not run')).toBeInTheDocument();
  });

  it('does not run an empty query', async () => {
    await renderApp(documentWith({ type: 'esql_editor', id: 'explore' }), noRunQuery);

    expect(await screen.findByTestId('customAppEsqlEditorRun')).toBeDisabled();
  });

  it('keeps the text in the value of the app it is bound to', async () => {
    const { runtime } = await renderApp(
      documentWith(
        { type: 'esql_editor', id: 'explore', query: '', bind: 'text' },
        { text: { type: 'string', default: '' } }
      ),
      noRunQuery
    );

    await userEvent.type(await screen.findByRole('textbox', { name: 'ES|QL query' }), 'ROW a = 1');

    await waitFor(() => expect(runtime.state$.getValue().text).toBe('ROW a = 1'));
  });
});
