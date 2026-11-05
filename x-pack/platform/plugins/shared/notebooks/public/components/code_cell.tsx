/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CodeCellDefinition } from '../../common/types';
import { formatCodeValue, type CodeLogEntry, type CodeLogLevel } from '../model/code_cell';
import type { CellOutput } from '../model/types';
import { CellFrame } from './cell_frame';
import { useNotebook } from './notebook_context';

const PLACEHOLDER = i18n.translate('xpack.notebook.codeCell.placeholder', {
  defaultMessage:
    "JavaScript. Read other cells' outputs by name, and export values to share them, e.g. export const total = rows.length;",
});
const EXPORTS_TITLE = i18n.translate('xpack.notebook.codeCell.exports', {
  defaultMessage: 'Exports',
});
const CONSOLE_TITLE = i18n.translate('xpack.notebook.codeCell.console', {
  defaultMessage: 'Console',
});

const LOG_ICONS: Record<CodeLogLevel, string> = {
  log: 'chevronSingleRight',
  info: 'info',
  debug: 'bug',
  warn: 'warning',
  error: 'error',
};

const LogLine = ({ entry }: { entry: CodeLogEntry }) => {
  const { euiTheme } = useEuiTheme();
  const { level, message } = entry;
  const color =
    level === 'error'
      ? euiTheme.colors.textDanger
      : level === 'warn'
      ? euiTheme.colors.textWarning
      : euiTheme.colors.textParagraph;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={LOG_ICONS[level]} size="s" color={color} aria-label={level} />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          color: ${color};
          white-space: pre-wrap;
          word-break: break-word;
        `}
      >
        {message}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** A code cell's exported values and console output. */
export const CodePreview = ({ output }: { output: Extract<CellOutput, { kind: 'code' }> }) => {
  const { euiTheme } = useEuiTheme();
  const exports = Object.entries(output.values);
  const { logs } = output;
  if (exports.length === 0 && logs.length === 0) return null;

  const monospace = css`
    font-family: ${euiTheme.font.familyCode};
    font-size: ${euiTheme.size.m};
  `;
  return (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      hasBorder={false}
      data-test-subj="notebookCodePreview"
    >
      {exports.length > 0 && (
        <>
          <EuiTitle size="xxxs">
            <h4>{EXPORTS_TITLE}</h4>
          </EuiTitle>
          <EuiText size="xs" css={monospace} data-test-subj="notebookCodeExports">
            {exports.map(([name, value]) => (
              <div key={name}>
                <strong>{name}</strong> = {formatCodeValue(value)}
              </div>
            ))}
          </EuiText>
        </>
      )}
      {exports.length > 0 && logs.length > 0 && <EuiSpacer size="s" />}
      {logs.length > 0 && (
        <>
          <EuiTitle size="xxxs">
            <h4>{CONSOLE_TITLE}</h4>
          </EuiTitle>
          <EuiText size="xs" css={monospace} data-test-subj="notebookCodeLogs">
            {logs.map((entry, index) => (
              <LogLine key={index} entry={entry} />
            ))}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

export const CodeCell = ({ cell }: { cell: CodeCellDefinition }) => {
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const [draft, setDraft] = useState(cell.code);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => setDraft(cell.code), [cell.code]);
  useEffect(
    () => scheduler.markEdited(cell.id, draft !== cell.code),
    [scheduler, cell.id, cell.code, draft]
  );

  const run = async (code: string): Promise<void> => {
    store.updateCell(cell.id, (current) =>
      current.type === 'code' ? { ...current, code } : current
    );
    await scheduler.runCell(cell.id);
  };
  const runRef = useRef(run);
  runRef.current = run;

  const { output } = runtime;

  return (
    <CellFrame cell={cell} runtime={runtime} onRun={() => run(draft)}>
      <CodeEditor
        languageId="javascript"
        value={draft}
        onChange={setDraft}
        placeholder={PLACEHOLDER}
        fitToContent={{ minLines: 3, maxLines: 30 }}
        editorDidMount={(editor) => {
          editor.onKeyDown((event) => {
            if (!(event.metaKey || event.ctrlKey) || event.browserEvent.key !== 'Enter') return;
            event.preventDefault();
            void runRef.current(draftRef.current);
          });
        }}
        options={{
          fontSize: 12,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
        dataTestSubj={`notebookCodeEditor-${cell.name}`}
      />
      {output?.kind === 'code' && (
        <>
          <EuiSpacer size="s" />
          <CodePreview output={output} />
        </>
      )}
    </CellFrame>
  );
};
