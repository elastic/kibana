/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiDataGrid,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import {
  ActionButtonType,
  type ActionButton,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { EsqlToolParam, EsqlToolParamValue, ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';

// Hardcoded here rather than imported from the agent_builder plugin's public
// surface: adding new exports to a sibling plugin's public/index.ts only
// reaches downstream bundles after a full Kibana restart, which made the
// "Run" button silently fail with `http.post(undefined, ...)` on hot-reload.
// The agent_builder routes these point at are stable and versioned, so
// owning the constants locally is the safer trade-off.
const TOOLS_API_PATH = '/api/agent_builder/tools';
const TOOLS_EXECUTE_DRAFT_API_PATH = '/internal/agent_builder/tools/_execute_draft';
type CreateToolResponse = ToolDefinitionWithSchema;
import {
  TOOL_ATTACHMENT_TYPE,
  type ToolAttachment,
  type ToolAttachmentData,
} from '../../../common/attachments';

const TOOLS_MANAGE_PATH = '/manage/tools';

const previewButtonLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.tool.previewButtonLabel',
  { defaultMessage: 'Preview' }
);
const editInManagementLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.tool.editInManagementButtonLabel',
  { defaultMessage: 'Edit in Management' }
);
const createToolLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.tool.createButtonLabel',
  { defaultMessage: 'Create tool' }
);
const lackManageToolsPermissionDescription = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.tool.createDisabledReason',
  { defaultMessage: 'You do not have permission to manage tools in this space.' }
);
const runTestButtonLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.tool.runTestButtonLabel',
  { defaultMessage: 'Run test' }
);

const renderBoldChunks = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

const formatParamLabel = (name: string): string =>
  name
    .split('_')
    .filter(Boolean)
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');

const numericTestInputStyles = css`
  max-width: 80px;
`;

const textTestInputStyles = css`
  max-width: 280px;
`;

const RESULTS_GRID_DEFAULT_PAGE_SIZE = 10;

const resultsGridContainerStyles = css`
  overflow: hidden;
`;

const renderInlineTestParamInput = ({
  name,
  param,
  value,
  setValues,
}: {
  name: string;
  param: EsqlToolParam;
  value: string | boolean | undefined;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
}) => {
  const label = formatParamLabel(name);

  if (param.type === 'boolean') {
    return (
      <EuiSwitch
        label={label}
        checked={value === true}
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.checked }))}
      />
    );
  }

  if (param.type === 'integer' || param.type === 'float') {
    return (
      <EuiFieldNumber
        compressed
        prepend={label}
        css={numericTestInputStyles}
        aria-label={label}
        value={String(value ?? '')}
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
      />
    );
  }

  return (
    <EuiFieldText
      compressed
      prepend={label}
      css={textTestInputStyles}
      aria-label={label}
      value={String(value ?? '')}
      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
    />
  );
};

interface ToolCardProps extends AttachmentRenderProps<ToolAttachment> {
  isCanvas?: boolean;
  http: HttpStart;
}

const ParameterList: React.FC<{ params: ToolAttachmentData['configuration']['params'] }> = ({
  params,
}) => {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.agentBuilderPlatform.attachments.tool.noParameters"
          defaultMessage="No parameters."
        />
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {entries.map(([name, param]) => (
        <EuiFlexItem grow={false} key={name}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.agentBuilderPlatform.attachments.tool.paramHeader"
                  defaultMessage="<bold>{name}</bold> · {type}{optional}"
                  values={{
                    name,
                    type: param.type,
                    optional: param.optional ? ' · optional' : '',
                    bold: renderBoldChunks,
                  }}
                />
              </EuiBadge>
            </EuiFlexItem>
            {param.optional && param.defaultValue !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <FormattedMessage
                    id="xpack.agentBuilderPlatform.attachments.tool.paramDefault"
                    defaultMessage="default: {value}"
                    values={{ value: JSON.stringify(param.defaultValue) }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {param.description?.trim() && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                <p>{param.description}</p>
              </EuiText>
            </>
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const parseParamValue = (
  raw: string,
  param: EsqlToolParam
): { value: EsqlToolParamValue; error?: string } | { skip: true } => {
  if (raw === '' && param.optional) return { skip: true };
  switch (param.type) {
    case 'string':
    case 'date':
      return { value: raw };
    case 'integer': {
      const n = Number(raw);
      if (!Number.isInteger(n)) {
        return { value: 0, error: `Expected an integer for ${param.type} parameter.` };
      }
      return { value: n };
    }
    case 'float': {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        return { value: 0, error: `Expected a number for ${param.type} parameter.` };
      }
      return { value: n };
    }
    case 'boolean':
      return { value: raw === 'true' };
    case 'array': {
      const parts = raw
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      return { value: parts };
    }
  }
};

interface CanvasTestSectionProps {
  data: ToolAttachmentData;
  http: HttpStart;
}

const CanvasTestSection: React.FC<CanvasTestSectionProps> = ({ data, http }) => {
  const params = data.configuration.params;
  const paramEntries = Object.entries(params);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {};
    for (const [name, p] of Object.entries(params)) {
      if (p.type === 'boolean') {
        initial[name] = p.defaultValue === true;
      } else if (p.defaultValue !== undefined) {
        initial[name] = Array.isArray(p.defaultValue)
          ? p.defaultValue.join(', ')
          : String(p.defaultValue);
      } else {
        initial[name] = '';
      }
    }
    return initial;
  });
  const [results, setResults] = useState<ToolResult[] | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setErrorMessage(undefined);
    setResults(undefined);

    const toolParams: Record<string, EsqlToolParamValue> = {};
    for (const [name, param] of Object.entries(params)) {
      const raw = values[name];
      if (typeof raw === 'boolean') {
        toolParams[name] = raw;
        continue;
      }
      const parsed = parseParamValue(raw, param);
      if ('skip' in parsed) continue;
      if (parsed.error) {
        setErrorMessage(`${name}: ${parsed.error}`);
        setIsRunning(false);
        return;
      }
      toolParams[name] = parsed.value;
    }

    try {
      const response = await http.post<{ results: ToolResult[] }>(TOOLS_EXECUTE_DRAFT_API_PATH, {
        body: JSON.stringify({
          type: data.type,
          configuration: data.configuration,
          tool_params: toolParams,
        }),
      });
      setResults(response.results);
    } catch (error) {
      const message =
        (error as { body?: { message?: string }; message?: string }).body?.message ??
        (error as Error).message;
      setErrorMessage(message);
    } finally {
      setIsRunning(false);
    }
  }, [data.configuration, data.type, http, params, values]);

  return (
    <div>
      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.tool.testHeader"
            defaultMessage="Test"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.agentBuilderPlatform.attachments.tool.testHelp"
          defaultMessage="Run the draft against your data without persisting. Uses your permissions."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          {paramEntries.map(([name, param]) => (
            <EuiFlexItem grow={false} key={name}>
              {renderInlineTestParamInput({
                name,
                param,
                value: values[name],
                setValues,
              })}
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="play"
              onClick={handleRun}
              isLoading={isRunning}
              data-test-subj="agentBuilderToolDraftRunButton"
            >
              {runTestButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {errorMessage && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              title={i18n.translate('xpack.agentBuilderPlatform.attachments.tool.testErrorTitle', {
                defaultMessage: 'Test run failed',
              })}
            >
              <EuiText size="s">{errorMessage}</EuiText>
            </EuiCallOut>
          </>
        )}
        {results && (
          <>
            <EuiSpacer size="m" />
            <ToolResultsView results={results} />
          </>
        )}
      </EuiPanel>
    </div>
  );
};

const ToolResultsView: React.FC<{ results: ToolResult[] }> = ({ results }) => {
  const esqlResult = results.find((r) => r.type === ToolResultType.esqlResults);
  const errorResult = results.find((r) => r.type === ToolResultType.error);

  if (errorResult) {
    const data = errorResult.data as { message: string };
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={i18n.translate('xpack.agentBuilderPlatform.attachments.tool.testErrorResultTitle', {
          defaultMessage: 'Tool returned an error',
        })}
      >
        <EuiText size="s">{data.message}</EuiText>
      </EuiCallOut>
    );
  }
  if (!esqlResult) {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.agentBuilderPlatform.attachments.tool.noEsqlResults"
          defaultMessage="No ES|QL results returned."
        />
      </EuiText>
    );
  }
  const data = esqlResult.data as {
    query: string;
    columns: Array<{ name: string }>;
    values: unknown[][];
  };
  return <EsqlResultsTable columns={data.columns} values={data.values} />;
};

const EsqlResultsTable: React.FC<{
  columns: Array<{ name: string }>;
  values: unknown[][];
}> = ({ columns, values }) => {
  const gridColumns: EuiDataGridColumn[] = useMemo(
    () => columns.map((c) => ({ id: c.name })),
    [columns]
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => columns.map((c) => c.name));
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: RESULTS_GRID_DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [columns, values]);

  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => setPagination((prev) => ({ ...prev, pageSize, pageIndex: 0 })),
    []
  );

  const onChangePage = useCallback(
    (pageIndex: number) => setPagination((prev) => ({ ...prev, pageIndex })),
    []
  );

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const colIdx = columns.findIndex((c) => c.name === columnId);
      const cell = values[rowIndex]?.[colIdx];
      if (cell === null || cell === undefined) return '—';
      if (typeof cell === 'object') return JSON.stringify(cell);
      return String(cell);
    },
    [columns, values]
  );

  return (
    <div css={resultsGridContainerStyles}>
      <EuiDataGrid
        aria-label="Tool test results"
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={values.length}
        renderCellValue={renderCellValue}
        gridStyle={{ border: 'horizontal', stripes: false, cellPadding: 's', fontSize: 's' }}
        pagination={{
          ...pagination,
          onChangeItemsPerPage,
          onChangePage,
        }}
        toolbarVisibility={false}
      />
    </div>
  );
};

const ToolCard: React.FC<ToolCardProps> = ({ attachment, isCanvas, http }) => {
  const { description, configuration } = attachment.data;
  const showCanvasExtras = isCanvas === true;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.tool.descriptionLabel"
            defaultMessage="Description"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>

      <EuiHorizontalRule margin="m" />

      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.tool.queryLabel"
            defaultMessage="ES|QL query"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock
        language="esql"
        fontSize="s"
        overflowHeight={showCanvasExtras ? undefined : 200}
        isCopyable
      >
        {configuration.query}
      </EuiCodeBlock>

      <EuiHorizontalRule margin="m" />

      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.tool.parametersLabel"
            defaultMessage="Parameters"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <ParameterList params={configuration.params} />

      {showCanvasExtras && (
        <>
          <EuiHorizontalRule margin="m" />
          <CanvasTestSection data={attachment.data} http={http} />
        </>
      )}
    </EuiPanel>
  );
};

const ToolInlineContent: React.FC<AttachmentRenderProps<ToolAttachment> & { http: HttpStart }> = (
  props
) => <ToolCard {...props} />;

const ToolCanvasContent: React.FC<AttachmentRenderProps<ToolAttachment> & { http: HttpStart }> = (
  props
) => <ToolCard {...props} isCanvas />;

interface CreateToolDeps {
  http: HttpStart;
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
}

/**
 * Factory for the `tool` UI definition.
 *
 * The Create button:
 * 1. Disables when the user lacks the `manageTools` capability.
 * 2. POSTs the captured payload to `/api/agent_builder/tools`.
 * 3. On success, calls `updateOrigin(toolId)` so the same attachment now
 *    references the persisted tool and the card flips to "Created".
 * 4. On failure, surfaces the agent_builder error message via core toasts.
 *
 * Canvas mode renders a separate Test section below Parameters that POSTs the
 * draft and parameter values to `/internal/agent_builder/tools/_execute_draft`
 * and displays results inline. The test affordance is canvas-only by design —
 * the inline card stays compact for read-at-a-glance and reserves "create vs.
 * test" choice to the larger surface.
 */
export const createToolAttachmentDefinition = ({
  http,
  notifications,
  application,
}: CreateToolDeps): AttachmentUIDefinition<ToolAttachment> => {
  const canCreate = application.capabilities.agentBuilder?.manageTools === true;
  const isLatest = ({
    version,
    versionCount,
  }: {
    version: number | undefined;
    versionCount: number | undefined;
  }) => typeof version === 'number' && typeof versionCount === 'number' && version === versionCount;

  return {
    getLabel: (attachment) =>
      attachment.data.id ||
      i18n.translate('xpack.agentBuilderPlatform.attachments.tool.label', {
        defaultMessage: 'Tool draft',
      }),
    getHeader: ({ attachment }) => {
      const { version, versionCount } = attachment;
      const badges: HeaderBadge[] = [];
      const isCreated = Boolean(attachment.origin);

      if (isCreated) {
        badges.push({
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.tool.createdBadge', {
            defaultMessage: 'Created',
          }),
          color: 'success',
          iconType: 'check',
        });
        // Created attachments only show created badge
        return { icon: 'wrench', subtitle: attachment.data.id, badges };
      }

      badges.push({
        label: i18n.translate('xpack.agentBuilderPlatform.attachments.tool.draftBadge', {
          defaultMessage: 'Draft',
        }),
      });

      if (isLatest({ version, versionCount })) {
        badges.push({
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.tool.latestBadge', {
            defaultMessage: 'Latest',
          }),
          color: 'primary',
        });
      }

      return { icon: 'wrench', subtitle: attachment.data.id, badges };
    },
    renderInlineContent: (props) => <ToolInlineContent {...props} http={http} />,
    renderCanvasContent: (props) => <ToolCanvasContent {...props} http={http} />,
    getActionButtons: ({ attachment, updateOrigin, openCanvas, isCanvas }) => {
      const { version, versionCount } = attachment;
      const isCreated = Boolean(attachment.origin);
      const actionButtons: ActionButton[] = [];

      const createTool = async () => {
        try {
          const response = await http.post<CreateToolResponse>(TOOLS_API_PATH, {
            body: JSON.stringify(attachment.data satisfies ToolAttachmentData),
          });
          await updateOrigin(response.id);
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.agentBuilderPlatform.attachments.tool.createSuccessToast',
              {
                defaultMessage: 'Tool "{toolId}" created.',
                values: { toolId: response.id },
              }
            ),
          });
        } catch (error) {
          notifications.toasts.addError(error as Error, {
            title: i18n.translate('xpack.agentBuilderPlatform.attachments.tool.createErrorToast', {
              defaultMessage: 'Could not create tool from draft',
            }),
          });
        }
      };

      if (!isCanvas && openCanvas) {
        actionButtons.push({
          label: previewButtonLabel,
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        });
      }

      if (isLatest({ version, versionCount })) {
        if (isCreated && attachment.origin) {
          const toolId = attachment.origin;
          actionButtons.push({
            label: editInManagementLabel,
            icon: 'pencil',
            type: ActionButtonType.PRIMARY,
            href: application.getUrlForApp(AGENTBUILDER_APP_ID, {
              path: `${TOOLS_MANAGE_PATH}/${toolId}`,
            }),
            openInNewTab: true,
            handler: () => {
              // navigation handled by href
            },
          });
        } else {
          actionButtons.push({
            label: createToolLabel,
            icon: 'plus',
            type: ActionButtonType.PRIMARY,
            disabled: !canCreate,
            disabledReason: !canCreate ? lackManageToolsPermissionDescription : undefined,
            handler: createTool,
          });
        }
      }

      return actionButtons;
    },
  };
};

export { TOOL_ATTACHMENT_TYPE };
