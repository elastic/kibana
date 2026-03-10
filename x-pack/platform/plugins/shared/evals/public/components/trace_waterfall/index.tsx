/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiCallOut,
  EuiResizableContainer,
  EuiSwitch,
  EuiBadge,
  EuiButtonIcon,
  EuiAccordion,
  EuiCodeBlock,
  EuiCopy,
  EuiStat,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TraceSpan } from '@kbn/evals-common';
import { useTrace } from '../../hooks/use_evals_api';
import {
  WaterfallItem,
  LABEL_WIDTH,
  SPAN_COLORS,
  getSpanCategory,
  type SpanCategory,
} from './waterfall_item';
import * as i18n from './translations';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

export interface SpanNode extends TraceSpan {
  children: SpanNode[];
  depth: number;
}

const NOISE_NAME_PATTERNS = [
  /^ext\s*-\s*on(Post|Pre)(Auth|Request|Response|Handler)/i,
  /^ext\s*-\s*onRequest/i,
  /^security\.(authenticate|has_privileges)/i,
];

const isNoiseSpan = (span: TraceSpan): boolean => {
  const { name, attributes } = span;

  if (NOISE_NAME_PATTERNS.some((pattern) => pattern.test(name))) return true;

  if (attributes?.['db.system'] === 'elasticsearch') {
    const collection = attributes['db.collection.name'] as string | undefined;
    if (collection?.startsWith('.kibana')) return true;
  }

  if (attributes?.['span.subtype'] === 'http' && attributes?.['span.type'] === 'external') {
    const target = (attributes['http.target'] ?? attributes['url.path'] ?? '') as string;
    if (target.startsWith('/.kibana') || target.startsWith('/_security')) return true;
    if (target.startsWith('/v1/projects') || target.startsWith('/v1/traces')) return true;
  }

  return false;
};

const buildSpanTree = (spans: TraceSpan[]): SpanNode[] => {
  const spanMap = new Map<string, SpanNode>();
  const roots: SpanNode[] = [];

  for (const span of spans) {
    spanMap.set(span.span_id, { ...span, children: [], depth: 0 });
  }

  for (const node of spanMap.values()) {
    if (node.parent_span_id && spanMap.has(node.parent_span_id)) {
      spanMap.get(node.parent_span_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const setDepths = (node: SpanNode, depth: number) => {
    node.depth = depth;
    node.children.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    for (const child of node.children) {
      setDepths(child, depth + 1);
    }
  };

  roots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  for (const root of roots) {
    setDepths(root, 0);
  }

  return roots;
};

const flattenTree = (nodes: SpanNode[], hideNoise: boolean): SpanNode[] => {
  const result: SpanNode[] = [];
  const recurse = (nodeList: SpanNode[]) => {
    for (const node of nodeList) {
      if (hideNoise && isNoiseSpan(node)) {
        recurse(node.children);
        continue;
      }
      result.push(node);
      recurse(node.children);
    }
  };
  recurse(nodes);
  return result;
};

const computeTickValues = (durationMs: number): number[] => {
  if (durationMs <= 0) return [];
  const count = 5;
  const step = durationMs / count;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    ticks.push(i * step);
  }
  return ticks;
};

const formatDuration = (ms: number): string => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 1 && ms > 0) return `${(ms * 1000).toFixed(0)}us`;
  return `${Math.round(ms)}ms`;
};

const LEGEND_ITEMS: Array<{ category: SpanCategory; label: string }> = [
  { category: 'llm', label: i18n.LEGEND_LLM },
  { category: 'tool', label: i18n.LEGEND_TOOL },
  { category: 'search', label: i18n.LEGEND_SEARCH },
  { category: 'http', label: i18n.LEGEND_HTTP },
  { category: 'other', label: i18n.LEGEND_OTHER },
];

interface TraceWaterfallProps {
  traceId: string;
}

export const TraceWaterfall: React.FC<TraceWaterfallProps> = ({ traceId }) => {
  const { data, isLoading, error } = useTrace(traceId);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [hideNoise, setHideNoise] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const { flatSpans, traceStartMs, traceDurationMs, noiseCount, tickPercents, tickLabels } =
    useMemo(() => {
      if (!data?.spans.length) {
        return {
          flatSpans: [],
          traceStartMs: 0,
          traceDurationMs: 0,
          noiseCount: 0,
          tickPercents: [],
          tickLabels: [],
        };
      }

      const tree = buildSpanTree(data.spans);
      const flat = flattenTree(tree, hideNoise);

      const startTimes = data.spans.map((s) => new Date(s.start_time).getTime());
      const minStart = Math.min(...startTimes);
      const maxEnd = Math.max(
        ...data.spans.map((s) => new Date(s.start_time).getTime() + s.duration_ms)
      );
      const dur = maxEnd - minStart;
      const noise = data.spans.filter((s) => isNoiseSpan(s)).length;

      const ticks = computeTickValues(dur);
      const percents = ticks.map((t) => (dur > 0 ? (t / dur) * 100 : 0));
      const labels = ticks.map((t) => formatDuration(t));

      return {
        flatSpans: flat,
        traceStartMs: minStart,
        traceDurationMs: dur,
        noiseCount: noise,
        tickPercents: percents,
        tickLabels: labels,
      };
    }, [data, hideNoise]);

  const handleSpanClick = useCallback(
    (spanId: string) => {
      setSelectedSpanId(spanId === selectedSpanId ? null : spanId);
    },
    [selectedSpanId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, flatSpans.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < flatSpans.length) {
        e.preventDefault();
        handleSpanClick(flatSpans[focusedIndex].span_id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedSpanId(null);
      }
    },
    [flatSpans, focusedIndex, handleSpanClick]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut title={i18n.ERROR_LOADING_TRACE_TITLE} color="danger" iconType="error">
        <p>{String(error)}</p>
      </EuiCallOut>
    );
  }

  if (!data || data.spans.length === 0) {
    return (
      <EuiCallOut title={i18n.NO_SPANS_FOUND_TITLE} color="warning" iconType="help">
        <p>
          <FormattedMessage
            id="xpack.evals.traceWaterfall.noSpansFoundMessage"
            defaultMessage="No spans were found for trace ID: {traceId}"
            values={{ traceId }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.evals.traceWaterfall.noSpansFoundHelp"
            defaultMessage="This usually means the trace was created before OTEL tracing was enabled, or the spans have not been exported yet. Ensure {configKey} is set in {configFile} and the EDOT collector is running."
            values={{
              configKey: <strong>telemetry.tracing.enabled: true</strong>,
              configFile: <code>kibana.yml</code>,
            }}
          />
        </p>
      </EuiCallOut>
    );
  }

  const selectedSpan = selectedSpanId ? flatSpans.find((s) => s.span_id === selectedSpanId) : null;

  const timeAxisStyle = css`
    display: flex;
    align-items: flex-end;
    height: 20px;
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    margin-bottom: 2px;
  `;

  const tickAreaStyle = css`
    flex: 1 1 0%;
    position: relative;
    height: 100%;
    min-width: 0;
  `;

  const renderWaterfallContent = () => (
    <>
      <div className={timeAxisStyle}>
        <div style={{ flex: `0 0 ${LABEL_WIDTH}px` }} />
        <div className={tickAreaStyle}>
          {tickLabels.map((label, idx) => (
            <span
              key={idx}
              style={{
                position: 'absolute',
                left: `${tickPercents[idx]}%`,
                transform:
                  idx === 0
                    ? 'none'
                    : idx === tickLabels.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
                fontSize: 10,
                color: euiTheme.colors.mediumShade,
                whiteSpace: 'nowrap',
                bottom: 2,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      {flatSpans.map((span, idx) => (
        <WaterfallItem
          key={span.span_id}
          span={span}
          traceStartMs={traceStartMs}
          traceDurationMs={traceDurationMs}
          isSelected={span.span_id === selectedSpanId}
          isFocused={idx === focusedIndex}
          onClick={() => {
            setFocusedIndex(idx);
            handleSpanClick(span.span_id);
          }}
          tickPercents={tickPercents}
        />
      ))}
    </>
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      style={{ height: '100%' }}
      onKeyDown={handleKeyDown}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{i18n.getSpanCount(flatSpans.length)}</strong>
              {hideNoise && noiseCount > 0 && (
                <>
                  {' '}
                  <EuiBadge color="hollow">{i18n.getHiddenCount(noiseCount)}</EuiBadge>
                </>
              )}{' '}
              &middot; {i18n.getTotalDuration((data.duration_ms ?? 0).toFixed(1))}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.HIDE_NOISE_LABEL}
              checked={hideNoise}
              onChange={(e) => setHideNoise(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {LEGEND_ITEMS.map(({ category, label }) => (
            <EuiFlexItem key={category} grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: SPAN_COLORS[category],
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {label}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      <EuiFlexItem style={{ minHeight: 0 }}>
        {selectedSpan ? (
          <EuiResizableContainer direction="vertical" style={{ height: '100%' }}>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel initialSize={55} minSize="20%" paddingSize="none">
                  <div
                    ref={scrollRef}
                    style={{ overflowY: 'auto', height: '100%' }}
                    tabIndex={0}
                    role="listbox"
                  >
                    {renderWaterfallContent()}
                  </div>
                </EuiResizablePanel>
                <EuiResizableButton indicator="border" />
                <EuiResizablePanel initialSize={45} minSize="15%" paddingSize="none">
                  <div style={{ overflowY: 'auto', height: '100%' }}>
                    <SpanDetail span={selectedSpan} onClose={() => setSelectedSpanId(null)} />
                  </div>
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        ) : (
          <div
            ref={scrollRef}
            style={{ overflowY: 'auto', height: '100%' }}
            tabIndex={0}
            role="listbox"
          >
            {renderWaterfallContent()}
          </div>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// --- Attribute categorization helpers ---

interface CategorizedAttrs {
  tokens: { input?: number; output?: number; total?: number };
  toolInput?: string;
  toolOutput?: string;
  llm: Record<string, unknown>;
  http: Record<string, unknown>;
  resource: Record<string, unknown>;
  other: Record<string, unknown>;
}

const PROMOTED_KEYS = new Set([
  'gen_ai.usage.input_tokens',
  'gen_ai.usage.output_tokens',
  'gen_ai.usage.total_tokens',
  'elastic.tool.parameters',
  'tool.parameters',
  'output.value',
]);

const categorizeAttributes = (attrs: Record<string, unknown>): CategorizedAttrs => {
  const result: CategorizedAttrs = {
    tokens: {},
    llm: {},
    http: {},
    resource: {},
    other: {},
  };

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'gen_ai.usage.input_tokens') {
      result.tokens.input = value as number;
    } else if (key === 'gen_ai.usage.output_tokens') {
      result.tokens.output = value as number;
    } else if (key === 'gen_ai.usage.total_tokens') {
      result.tokens.total = value as number;
    } else if (key === 'elastic.tool.parameters' || key === 'tool.parameters') {
      result.toolInput = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    } else if (key === 'output.value') {
      result.toolOutput =
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    } else if (PROMOTED_KEYS.has(key)) {
      continue;
    } else if (key.startsWith('gen_ai.') || key.startsWith('llm.')) {
      result.llm[key] = value;
    } else if (
      key.startsWith('http.') ||
      key.startsWith('url.') ||
      key.startsWith('net.') ||
      key.startsWith('server.')
    ) {
      result.http[key] = value;
    } else if (key.startsWith('resource.')) {
      result.resource[key] = value;
    } else {
      result.other[key] = value;
    }
  }

  return result;
};

const tryFormatJson = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

// --- SpanDetail component ---

const SpanDetail: React.FC<{ span: SpanNode; onClose: () => void }> = ({ span, onClose }) => {
  const categorized = useMemo(() => categorizeAttributes(span.attributes ?? {}), [span.attributes]);
  const hasTokens =
    categorized.tokens.input != null ||
    categorized.tokens.output != null ||
    categorized.tokens.total != null;

  const category = getSpanCategory(span);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      {/* Header */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 20,
                  borderRadius: 2,
                  backgroundColor: SPAN_COLORS[category],
                  flexShrink: 0,
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <h4 style={{ margin: 0 }}>{span.name}</h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            aria-label={i18n.CLOSE_DETAIL_ARIA}
            onClick={onClose}
            size="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{i18n.DURATION_LABEL}</strong> {(span.duration_ms ?? 0).toFixed(1)}ms
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{i18n.KIND_LABEL}</strong> {span.kind ?? '-'}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{i18n.STATUS_LABEL}</strong> {span.status ?? '-'}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={span.span_id}>
            {(copy) => (
              <EuiButtonIcon
                iconType="copy"
                aria-label={i18n.COPY_SPAN_ID_ARIA}
                onClick={copy}
                size="xs"
                color="text"
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Token Summary */}
      {hasTokens && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" responsive={false}>
            {categorized.tokens.input != null && (
              <EuiFlexItem>
                <EuiStat
                  title={String(categorized.tokens.input)}
                  description={i18n.INPUT_TOKENS_DESC}
                  titleSize="xxs"
                  isLoading={false}
                />
              </EuiFlexItem>
            )}
            {categorized.tokens.output != null && (
              <EuiFlexItem>
                <EuiStat
                  title={String(categorized.tokens.output)}
                  description={i18n.OUTPUT_TOKENS_DESC}
                  titleSize="xxs"
                  isLoading={false}
                />
              </EuiFlexItem>
            )}
            {categorized.tokens.total != null && (
              <EuiFlexItem>
                <EuiStat
                  title={String(categorized.tokens.total)}
                  description={i18n.TOTAL_TOKENS_DESC}
                  titleSize="xxs"
                  isLoading={false}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}

      {/* Tool I/O */}
      {categorized.toolInput && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <h5>{i18n.TOOL_INPUT_HEADING}</h5>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="s"
            overflowHeight={150}
            isCopyable
          >
            {tryFormatJson(categorized.toolInput)}
          </EuiCodeBlock>
        </>
      )}
      {categorized.toolOutput && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <h5>{i18n.TOOL_OUTPUT_HEADING}</h5>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="s"
            overflowHeight={150}
            isCopyable
          >
            {tryFormatJson(categorized.toolOutput)}
          </EuiCodeBlock>
        </>
      )}

      {/* LLM Attributes */}
      {Object.keys(categorized.llm).length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <h5>{i18n.LLM_ATTRIBUTES_HEADING}</h5>
          </EuiText>
          <EuiSpacer size="xs" />
          <AttrTable attrs={categorized.llm} />
        </>
      )}

      {/* HTTP Attributes - collapsed */}
      {Object.keys(categorized.http).length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={`http-${span.span_id}`}
            buttonContent={i18n.HTTP_ATTRIBUTES_HEADING}
            paddingSize="xs"
          >
            <AttrTable attrs={categorized.http} />
          </EuiAccordion>
        </>
      )}

      {/* Other Attributes - collapsed */}
      {Object.keys(categorized.other).length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={`other-${span.span_id}`}
            buttonContent={i18n.getOtherAttributesHeading(Object.keys(categorized.other).length)}
            paddingSize="xs"
          >
            <AttrTable attrs={categorized.other} />
          </EuiAccordion>
        </>
      )}

      {/* Resource Attributes - collapsed */}
      {Object.keys(categorized.resource).length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={`resource-${span.span_id}`}
            buttonContent={i18n.getResourceAttributesHeading(
              Object.keys(categorized.resource).length
            )}
            paddingSize="xs"
          >
            <AttrTable attrs={categorized.resource} />
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
};

// --- Attribute table with copy support ---

const AttrTable: React.FC<{ attrs: Record<string, unknown> }> = ({ attrs }) => (
  <table style={{ fontSize: '12px', width: '100%' }}>
    <tbody>
      {Object.entries(attrs).map(([key, value]) => {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return (
          <tr key={key}>
            <td
              style={{
                fontWeight: 'bold',
                padding: '2px 8px 2px 0',
                whiteSpace: 'nowrap',
                verticalAlign: 'top',
              }}
            >
              {key}
            </td>
            <td style={{ padding: '2px 0', wordBreak: 'break-all' }}>
              <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
                <EuiFlexItem>{strValue}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={strValue}>
                    {(copy) => (
                      <EuiButtonIcon
                        iconType="copy"
                        aria-label={i18n.getCopyAttributeAriaLabel(key)}
                        onClick={copy}
                        size="xs"
                        color="text"
                        style={{ opacity: 0.4 }}
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);
