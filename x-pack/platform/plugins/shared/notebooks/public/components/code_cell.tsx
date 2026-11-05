/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CodeCellDefinition } from '../../common/types';
import type { CodeLogEntry, CodeLogLevel } from '../model/code_cell';
import { CellFrame } from './cell_frame';
import { useNotebook } from './notebook_context';

const PLACEHOLDER = i18n.translate('xpack.notebook.codeCell.placeholder', {
  defaultMessage:
    "JavaScript. Read other cells' outputs by name, and export values to share them, e.g. export const total = rows.length;",
});
const CONSOLE_TITLE = i18n.translate('xpack.notebook.codeCell.console', {
  defaultMessage: 'Console',
});
type CountLevel = 'log' | 'warn' | 'error';
const COUNT_ORDER: readonly CountLevel[] = ['log', 'warn', 'error'];

const getCountLevel = (level: CodeLogLevel): CountLevel =>
  level === 'warn' || level === 'error' ? level : 'log';

const getLevelCountLabel = (level: CountLevel, count: number) => {
  switch (level) {
    case 'log':
      return i18n.translate('xpack.notebook.codeCell.logCount', {
        defaultMessage: '{count, plural, one {# log} other {# logs}}',
        values: { count },
      });
    case 'warn':
      return i18n.translate('xpack.notebook.codeCell.warningCount', {
        defaultMessage: '{count, plural, one {# warning} other {# warnings}}',
        values: { count },
      });
    case 'error':
      return i18n.translate('xpack.notebook.codeCell.errorCount', {
        defaultMessage: '{count, plural, one {# error} other {# errors}}',
        values: { count },
      });
  }
};

const LOG_ICONS: Partial<Record<CodeLogLevel, string>> = {
  info: 'info',
  debug: 'bug',
  warn: 'warning',
  error: 'error',
};

const useLevelColors = (level: CodeLogLevel) => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  if (level === 'error') {
    return {
      text: colors.textDanger,
      background: colors.backgroundBaseDanger,
      border: colors.borderBaseDanger,
    };
  }
  if (level === 'warn') {
    return {
      text: colors.textWarning,
      background: colors.backgroundBaseWarning,
      border: colors.borderBaseWarning,
    };
  }
  return {
    text: level === 'debug' ? colors.textSubdued : colors.textParagraph,
    background: 'transparent',
    border: colors.borderBaseSubdued,
  };
};

const ConsoleLine = ({ entry: { level, message } }: { entry: CodeLogEntry }) => {
  const { euiTheme } = useEuiTheme();
  const { text, background, border } = useLevelColors(level);
  const icon = LOG_ICONS[level];
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      data-test-subj={`notebookCodeLog-${level}`}
      css={css`
        color: ${text};
        background: ${background};
        border-block: ${euiTheme.border.width.thin} solid ${border};
        margin-block-start: -${euiTheme.border.width.thin};
        padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem
        grow={false}
        css={css`
          inline-size: ${euiTheme.size.base};
          padding-block-start: ${euiTheme.size.xxs};
        `}
      >
        {icon && <EuiIcon type={icon} size="s" color={text} aria-label={level} />}
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          white-space: pre-wrap;
          word-break: break-word;
        `}
      >
        {message}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const LevelCount = ({ level, count }: { level: CountLevel; count: number }) => {
  const { text } = useLevelColors(level);
  return (
    <>
      {' · '}
      <span
        css={css`
          color: ${text};
        `}
      >
        {getLevelCountLabel(level, count)}
      </span>
    </>
  );
};

/** DevTools-style console listing a code cell's `console.*` calls; collapsible. */
const CodeConsole = ({ cellId, logs }: { cellId: string; logs: readonly CodeLogEntry[] }) => {
  const { euiTheme } = useEuiTheme();
  if (logs.length === 0) return null;
  const countOf = (level: CountLevel) =>
    logs.filter((entry) => getCountLevel(entry.level) === level).length;
  return (
    <EuiAccordion
      id={`notebookCodeConsole-${cellId}`}
      initialIsOpen
      paddingSize="none"
      buttonContent={
        <EuiText size="xs">
          <strong>{CONSOLE_TITLE}</strong>
          {COUNT_ORDER.map((level) => {
            const count = countOf(level);
            return count > 0 && <LevelCount key={level} level={level} count={count} />;
          })}
        </EuiText>
      }
      data-test-subj="notebookCodeLogs"
    >
      <div
        css={css`
          margin-block-start: ${euiTheme.size.xs};
          max-block-size: calc(${euiTheme.size.l} * 12);
          overflow-y: auto;
          font-family: ${euiTheme.font.familyCode};
          font-size: ${euiTheme.size.m};
          line-height: ${euiTheme.size.l};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.small};
          padding-block-start: ${euiTheme.border.width.thin};
        `}
      >
        {logs.map((entry, index) => (
          <ConsoleLine key={index} entry={entry} />
        ))}
      </div>
    </EuiAccordion>
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
      {output?.kind === 'code' && output.logs.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <CodeConsole cellId={cell.id} logs={output.logs} />
        </>
      )}
    </CellFrame>
  );
};
