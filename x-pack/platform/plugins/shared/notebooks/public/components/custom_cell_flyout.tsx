/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiResizeObserver,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CustomCellDefinition } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import type { CellRuntime } from '../model/types';
import { useNotebookServices } from '../services';
import { LazyEsqlEditor } from './lazy_esql_editor';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';
import { ResultGrid, ResultPreview } from './result_preview';

const EDITOR_DEFAULT_HEIGHT = 400;

/** Select value for the panel's own query; cell ids are UUIDs, so it cannot collide. */
const CUSTOM_QUERY = 'customQuery';

const COPY_TEMPLATE_LABEL = i18n.translate('xpack.notebook.customCell.flyout.copyTemplate', {
  defaultMessage: 'Copy template',
});

/** What the flyout edits, applied to the cell together. */
export interface CustomCellDraft {
  dataSource: 'cell' | 'query';
  sourceCell: string | null;
  query: string;
  template: string;
}

/** A draft template and the rows it renders with, shown in the cell before it is applied. */
export interface TemplatePreview {
  template: string;
  table: Datatable | undefined;
}

export const toDraft = ({
  dataSource = 'cell',
  sourceCell,
  query = '',
  template,
}: CustomCellDefinition): CustomCellDraft => ({ dataSource, sourceCell, query, template });

const getTable = ({ output }: CellRuntime): Datatable | undefined =>
  output?.kind === 'table' ? output.table : undefined;

/** Hands the panel to Agent Builder, worded for whether there is a template to refine. */
export const GenerateWithChatButton = ({
  hasTemplate,
  onClick,
}: {
  hasTemplate: boolean;
  onClick: () => void;
}) => (
  <AiButton
    size="s"
    iconType="sparkles"
    onClick={onClick}
    data-test-subj="notebookCustomGenerateWithChat"
  >
    {hasTemplate
      ? i18n.translate('xpack.notebook.customCell.refineWithChat', {
          defaultMessage: 'Refine with chat',
        })
      : i18n.translate('xpack.notebook.customCell.generateWithChat', {
          defaultMessage: 'Generate with chat',
        })}
  </AiButton>
);

/** A flyout section heading, styled like the Dashboard custom panel editor's. */
const SectionTitle = ({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
  </EuiFlexGroup>
);

const NoData = ({ message }: { message: string }) => (
  <EuiText size="s" color="subdued">
    <p>{message}</p>
  </EuiText>
);

/** A source cell's latest results; keyed by cell id so it subscribes to the right runtime. */
const SourceCellData = ({ cellId }: { cellId: string }) => {
  const { store } = useNotebook();
  const table = getTable(useStateFromPublishingSubject(store.getRuntime$(cellId)));
  return table ? (
    <ResultGrid table={table} />
  ) : (
    <NoData
      message={i18n.translate('xpack.notebook.customCell.flyout.noSourceData', {
        defaultMessage: 'Run the source cell to see its results.',
      })}
    />
  );
};

interface QueryRun {
  query: string;
  /** Counts runs from the flyout; absent for the cell's applied results. */
  runId?: number;
  table?: Datatable;
  truncated?: boolean;
  durationMs?: number;
  error?: string;
}

interface CustomCellFlyoutProps {
  cell: CustomCellDefinition;
  onPreview: (preview: TemplatePreview) => void;
  onApply: (draft: CustomCellDraft) => void;
  onClose: () => void;
  /** Omitted when Agent Builder is unavailable. */
  onGenerateWithChat?: (draft: CustomCellDraft) => void;
}

/** Edits a custom cell's data source and template, previewing drafts in the cell before applying them. */
export const CustomCellFlyout = ({
  cell,
  onPreview,
  onApply,
  onClose,
  onGenerateWithChat,
}: CustomCellFlyoutProps) => {
  const { core } = useNotebookServices();
  const { store, scheduler } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const titleId = useGeneratedHtmlId({ prefix: 'notebookCustomFlyoutTitle' });
  const [saved] = useState(() => toDraft(cell));
  const [draft, setDraft] = useState(saved);
  const [queryRun, setQueryRun] = useState<QueryRun>();
  const [isRunning, setIsRunning] = useState(false);
  const controller = useRef<AbortController>();
  const runCount = useRef(0);
  const [editorHeight, setEditorHeight] = useState(EDITOR_DEFAULT_HEIGHT);
  const editorHeightRef = useRef(EDITOR_DEFAULT_HEIGHT);

  useEffect(() => () => controller.current?.abort(), []);

  const update = (patch: Partial<CustomCellDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const isQuery = draft.dataSource === 'query';
  const esqlCells = Object.values(cells).filter(({ type }) => type === 'esql');
  const source = !isQuery && draft.sourceCell ? cells[draft.sourceCell] : undefined;
  const sourceQuery = source?.type === 'esql' ? source.query : undefined;

  // The draft query's results, when they are known without running it.
  const knownQueryRun: QueryRun | undefined =
    queryRun?.query === draft.query
      ? queryRun
      : saved.dataSource === 'query' && draft.query === saved.query
      ? {
          query: saved.query,
          table: getTable(runtime),
          truncated: runtime.output?.kind === 'table' && runtime.output.truncated,
          durationMs: runtime.durationMs,
        }
      : undefined;

  const runDraftQuery = async (): Promise<Datatable | undefined> => {
    const { query } = draft;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setIsRunning(true);
    try {
      const { table, truncated, durationMs } = await scheduler.previewQuery(query, current.signal);
      if (current.signal.aborted) return;
      runCount.current += 1;
      setQueryRun({ query, runId: runCount.current, table, truncated, durationMs });
      return table;
    } catch (runError) {
      if (current.signal.aborted) return;
      setQueryRun({
        query,
        error: runError instanceof Error ? runError.message : String(runError),
      });
    } finally {
      if (!current.signal.aborted) setIsRunning(false);
    }
  };

  const getDraftTable = async (): Promise<Datatable | undefined> => {
    if (!isQuery)
      return draft.sourceCell ? getTable(store.getRuntime(draft.sourceCell)) : undefined;
    if (!draft.query.trim()) return undefined;
    return knownQueryRun ? knownQueryRun.table : runDraftQuery();
  };

  const preview = async () => onPreview({ template: draft.template, table: await getDraftTable() });

  const onEditorResize = useCallback(({ height }: { height: number }) => {
    if (height === editorHeightRef.current) return;
    editorHeightRef.current = height;
    setEditorHeight(height);
  }, []);

  const editorContainerCss = css`
    position: relative;
    resize: vertical;
    min-height: ${EDITOR_DEFAULT_HEIGHT}px;
    height: ${EDITOR_DEFAULT_HEIGHT}px;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;

  const copyButtonCss = css`
    position: absolute;
    top: ${euiTheme.size.xs};
    right: ${euiTheme.size.m};
    z-index: ${euiTheme.levels.content};
  `;

  const description = source
    ? i18n.translate('xpack.notebook.customCell.flyout.description', {
        defaultMessage: 'Present the results of {source} with HTML.',
        values: { source: getCellDisplayName(source) },
      })
    : isQuery
    ? i18n.translate('xpack.notebook.customCell.flyout.descriptionQuery', {
        defaultMessage: 'Present the results of an ES|QL query with HTML.',
      })
    : i18n.translate('xpack.notebook.customCell.flyout.descriptionNoSource', {
        defaultMessage: 'Present your data with HTML.',
      });

  return (
    <NotebookFlyout
      type="push"
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookCustomEditFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={titleId}>
                {i18n.translate('xpack.notebook.customCell.flyout.title', {
                  defaultMessage: 'Edit custom panel',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.notebook.customCell.flyout.previewTooltip', {
                defaultMessage:
                  'Custom panels are in technical preview and may change or be removed in future releases.',
              })}
            >
              <EuiBetaBadge
                tabIndex={0}
                iconType="flask"
                label={i18n.translate('xpack.notebook.customCell.flyout.previewLabel', {
                  defaultMessage: 'Technical preview',
                })}
                size="s"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {description}{' '}
            <EuiLink href={core.docLinks.links.visualize.customPanels} target="_blank" external>
              {i18n.translate('xpack.notebook.customCell.flyout.learnMore', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <SectionTitle
          icon={
            <EuiText size="s" color="subdued">
              {'</>'}
            </EuiText>
          }
          title={i18n.translate('xpack.notebook.customCell.flyout.templateLabel', {
            defaultMessage: 'Template',
          })}
          action={
            onGenerateWithChat && (
              <GenerateWithChatButton
                hasTemplate={Boolean(draft.template.trim())}
                onClick={() => onGenerateWithChat(draft)}
              />
            )
          }
        />
        <EuiSpacer size="s" />
        <EuiFormRow
          fullWidth
          helpText={i18n.translate('xpack.notebook.customCell.flyout.templateHelpText', {
            defaultMessage:
              'HTML and CSS, with Liquid tags to insert the source results. For each row, row["column"].value is the value and row["column"].pct is its percentage of the column\'s highest value, useful for bar widths.',
          })}
        >
          <EuiResizeObserver onResize={onEditorResize}>
            {(resizeRef) => (
              <div ref={resizeRef} css={editorContainerCss}>
                <CodeEditor
                  languageId="liquid"
                  value={draft.template}
                  onChange={(template) => update({ template })}
                  height={editorHeight}
                  placeholder={
                    onGenerateWithChat
                      ? i18n.translate('xpack.notebook.customCell.flyout.placeholderAi', {
                          defaultMessage:
                            '<!-- Write your HTML, CSS, and Liquid here, or select Generate with chat. -->',
                        })
                      : i18n.translate('xpack.notebook.customCell.flyout.placeholder', {
                          defaultMessage: '<!-- Write your HTML, CSS, and Liquid here. -->',
                        })
                  }
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: true,
                  }}
                />
                <EuiToolTip
                  content={COPY_TEMPLATE_LABEL}
                  disableScreenReaderOutput
                  anchorProps={{ css: copyButtonCss }}
                >
                  <EuiButtonIcon
                    iconType="copy"
                    aria-label={COPY_TEMPLATE_LABEL}
                    onClick={() => navigator.clipboard?.writeText(draft.template)}
                    data-test-subj="notebookCustomCopyTemplate"
                  />
                </EuiToolTip>
              </div>
            )}
          </EuiResizeObserver>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <div data-test-subj="notebookCustomDataSection">
          <SectionTitle
            icon={<EuiIcon type="database" size="s" aria-hidden={true} />}
            title={i18n.translate('xpack.notebook.customCell.flyout.dataSection', {
              defaultMessage: 'Data source',
            })}
            action={
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.notebook.customCell.flyout.dataSectionOptional', {
                  defaultMessage: 'Optional',
                })}
              </EuiText>
            }
          />
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.notebook.customCell.flyout.source', {
              defaultMessage: 'Source',
            })}
          >
            <EuiSelect
              fullWidth
              hasNoInitialSelection={!isQuery && !draft.sourceCell}
              value={isQuery ? CUSTOM_QUERY : draft.sourceCell ?? ''}
              options={[
                {
                  value: CUSTOM_QUERY,
                  text: i18n.translate('xpack.notebook.customCell.flyout.customQuery', {
                    defaultMessage: 'Custom ES|QL query',
                  }),
                },
                ...esqlCells.map((esqlCell) => ({
                  value: esqlCell.id,
                  text: getCellDisplayName(esqlCell),
                })),
              ]}
              onChange={({ target: { value } }) =>
                update(
                  value === CUSTOM_QUERY
                    ? { dataSource: 'query', query: draft.query || sourceQuery || '' }
                    : { dataSource: 'cell', sourceCell: value }
                )
              }
              data-test-subj="notebookCustomSource"
            />
          </EuiFormRow>
          {isQuery && (
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.notebook.customCell.flyout.query', {
                defaultMessage: 'Query',
              })}
              labelAppend={
                <EuiButtonEmpty
                  size="xs"
                  iconType="play"
                  isLoading={isRunning}
                  isDisabled={!draft.query.trim()}
                  onClick={runDraftQuery}
                  data-test-subj="notebookCustomRunQuery"
                >
                  {i18n.translate('xpack.notebook.customCell.flyout.runQuery', {
                    defaultMessage: 'Run',
                  })}
                </EuiButtonEmpty>
              }
            >
              <Suspense fallback={<EuiLoadingSpinner />}>
                <LazyEsqlEditor
                  query={{ esql: draft.query }}
                  onTextLangQueryChange={({ esql }) => update({ query: esql })}
                  onTextLangQuerySubmit={async () => {
                    await runDraftQuery();
                  }}
                  isLoading={isRunning}
                  editorIsInline
                  hideRunQueryButton
                  hideQueryHistory
                  hideQuickSearch
                  disableAutoFocus
                  expandToFitQueryOnMount
                  dataTestSubj="notebookCustomQueryEditor"
                />
              </Suspense>
            </EuiFormRow>
          )}
          {isQuery && knownQueryRun?.error && (
            <>
              <EuiSpacer size="s" />
              <KbnDangerCallout
                announceOnMount
                size="s"
                title={knownQueryRun.error}
                data-test-subj="notebookCustomQueryError"
              />
            </>
          )}
          {isQuery && knownQueryRun?.table && (
            <>
              <EuiSpacer size="s" />
              <ResultPreview
                key={knownQueryRun.runId ?? 'applied'}
                id={`${titleId}-query`}
                table={knownQueryRun.table}
                truncated={knownQueryRun.truncated ?? false}
                durationMs={knownQueryRun.durationMs}
                initialIsOpen={knownQueryRun.runId !== undefined}
              />
            </>
          )}
          {!isQuery && (
            <>
              <EuiSpacer size="s" />
              {draft.sourceCell ? (
                <SourceCellData key={draft.sourceCell} cellId={draft.sourceCell} />
              ) : (
                <NoData
                  message={i18n.translate('xpack.notebook.customCell.flyout.pickSource', {
                    defaultMessage: 'Pick a source to see its results.',
                  })}
                />
              )}
            </>
          )}
        </div>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="notebookCustomCancel">
              {i18n.translate('xpack.notebook.customCell.flyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  isLoading={isRunning}
                  disabled={!draft.template.trim()}
                  onClick={preview}
                  data-test-subj="notebookCustomRunPreview"
                >
                  {i18n.translate('xpack.notebook.customCell.flyout.runPreview', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={isEqual(draft, saved)}
                  onClick={() => onApply(draft)}
                  data-test-subj="notebookCustomApply"
                >
                  {i18n.translate('xpack.notebook.customCell.flyout.apply', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </NotebookFlyout>
  );
};
