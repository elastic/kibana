/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ComposeDiscoverTabs } from './compose_discover_tabs';

jest.mock('@kbn/code-editor', () => {
  const ReactActual = jest.requireActual('react');

  return {
    ESQL_LANG_ID: 'esql',
    CodeEditor: ({
      value,
      languageId,
      editorDidMount,
    }: {
      value: string;
      languageId: string;
      editorDidMount?: (editor: unknown) => void;
    }) => {
      ReactActual.useEffect(() => {
        editorDidMount?.({ getModel: () => ({ id: value }) });
      }, [editorDidMount, value]);

      return (
        <pre data-language-id={languageId} data-test-subj="codeEditorMock">
          {value}
        </pre>
      );
    },
  };
});

describe('ComposeDiscoverTabs', () => {
  const baseQuery = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
  const alertBlock = '| WHERE count > 100';
  const recoveryBlock = '| WHERE count < 100';
  const defaultProps = {
    baseQuery,
    alertBlock,
    recoveryBlock,
    onBaseQueryChange: jest.fn(),
    onAlertBlockChange: jest.fn(),
    onRecoveryBlockChange: jest.fn(),
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the recovery query editor with the recovery completion handler', async () => {
    const onAlertEditorMount = jest.fn();
    const onRecoveryEditorMount = jest.fn();

    render(
      <ComposeDiscoverTabs
        {...defaultProps}
        activeTab="recovery"
        tabs={['recovery']}
        onAlertEditorMount={onAlertEditorMount}
        onRecoveryEditorMount={onRecoveryEditorMount}
      />
    );

    await waitFor(() => {
      expect(onRecoveryEditorMount).toHaveBeenCalledTimes(1);
    });
    expect(onAlertEditorMount).not.toHaveBeenCalled();
  });

  it('renders the locked base query above the recovery block editor', () => {
    render(
      <ComposeDiscoverTabs
        {...defaultProps}
        activeTab="recovery"
        tabs={['recovery']}
        hideTabBar
        onRecoveryEditorMount={jest.fn()}
      />
    );

    const editors = screen.getAllByTestId('codeEditorMock');
    expect(editors).toHaveLength(2);
    expect(editors[0]).toHaveTextContent('FROM logs-*');
    expect(editors[1]).toHaveTextContent(recoveryBlock);
  });

  it('uses the ES|QL language for base and split block editors', () => {
    render(
      <ComposeDiscoverTabs
        {...defaultProps}
        activeTab="alert"
        tabs={['base', 'alert']}
        onAlertEditorMount={jest.fn()}
        onRecoveryEditorMount={jest.fn()}
      />
    );

    expect(screen.getAllByTestId('codeEditorMock')).toHaveLength(2);
    expect(screen.getAllByTestId('codeEditorMock')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataset: expect.objectContaining({ languageId: 'esql' }) }),
      ])
    );
  });
});
