/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiBasicTableColumn,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { GenAiTab, getGenAiFields, hasGenAiData } from '@kbn/apm-ui-shared';
import type { SpanNode } from './types';
import { SPAN_COLORS, getSpanCategory } from './get_span_category';
import * as i18n from './translations';

const EMPTY_ATTRIBUTES: Record<string, unknown> = {};

/**
 * Attributes already rendered by `GenAiTab`. Every other key — including the
 * remaining `gen_ai.*` ones — falls through to the attributes tab.
 */
const ATTRIBUTES_RENDERED_BY_GENAI_TAB = new Set([
  'gen_ai.operation.name',
  'gen_ai.provider.name',
  'gen_ai.system',
  'gen_ai.request.model',
  'gen_ai.request.temperature',
  'gen_ai.request.top_p',
  'gen_ai.request.top_k',
  'gen_ai.request.max_tokens',
  'gen_ai.request.seed',
  'gen_ai.response.model',
  'gen_ai.response.id',
  'gen_ai.response.finish_reasons',
  'gen_ai.usage.input_tokens',
  'gen_ai.usage.output_tokens',
  'gen_ai.conversation.id',
  'gen_ai.input.messages',
  'gen_ai.output.messages',
  'gen_ai.system_instructions',
  'gen_ai.tool.definitions',
  'gen_ai.tool.name',
  'gen_ai.tool.call.arguments',
  'gen_ai.tool.call.result',
]);

interface AttributeRow {
  field: string;
  value: string;
}

interface AttributeGroups {
  http: AttributeRow[];
  other: AttributeRow[];
  resource: AttributeRow[];
}

const toRow = (field: string, value: unknown): AttributeRow => ({
  field,
  value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
});

const groupAttributes = (attrs: Record<string, unknown>): AttributeGroups => {
  const groups: AttributeGroups = { http: [], other: [], resource: [] };

  for (const [field, value] of Object.entries(attrs)) {
    if (ATTRIBUTES_RENDERED_BY_GENAI_TAB.has(field)) {
      continue;
    }
    if (
      field.startsWith('http.') ||
      field.startsWith('url.') ||
      field.startsWith('net.') ||
      field.startsWith('server.')
    ) {
      groups.http.push(toRow(field, value));
    } else if (field.startsWith('resource.')) {
      groups.resource.push(toRow(field, value));
    } else {
      groups.other.push(toRow(field, value));
    }
  }

  return groups;
};

// Mirrors the GenAI tab's field table: row separators only, no outer borders.
const attributeTableCss = css`
  thead {
    display: none;
  }
  tr:first-of-type td {
    border-top: none;
  }
  tr:last-of-type td {
    border-bottom: none;
  }
`;

const attributeValueCss = css`
  word-break: break-all;
`;

const ATTRIBUTE_COLUMNS: Array<EuiBasicTableColumn<AttributeRow>> = [
  {
    field: 'field' as const,
    name: i18n.ATTRIBUTE_FIELD_COLUMN,
    // Wider than the GenAI field table since these are full dotted attribute keys.
    width: '240px',
    render: (field: string) => (
      <EuiText size="xs">
        <strong>{field}</strong>
      </EuiText>
    ),
  },
  {
    field: 'value' as const,
    name: i18n.ATTRIBUTE_VALUE_COLUMN,
    render: (value: string, row: AttributeRow) => (
      <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" css={attributeValueCss}>
            {value}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={value}>
            {(copy) => (
              <EuiToolTip
                content={i18n.getCopyAttributeAriaLabel(row.field)}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="copy"
                  aria-label={i18n.getCopyAttributeAriaLabel(row.field)}
                  onClick={copy}
                  size="xs"
                  color="text"
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

interface AttributeSectionProps {
  id: string;
  title: string;
  rows: AttributeRow[];
}

const AttributeSection: React.FC<AttributeSectionProps> = ({ id, title, rows }) => (
  <EuiAccordion
    id={id}
    data-test-subj={`spanAttributeSection-${id}`}
    initialIsOpen
    buttonContent={
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
    }
  >
    <EuiSpacer size="s" />
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      <EuiBasicTable
        itemId="field"
        tableLayout="auto"
        compressed
        items={rows}
        columns={ATTRIBUTE_COLUMNS}
        css={attributeTableCss}
        tableCaption={title}
      />
    </EuiPanel>
  </EuiAccordion>
);

interface SpanDetailProps {
  span: SpanNode;
  onClose: () => void;
}

export const SpanDetail: React.FC<SpanDetailProps> = ({ span, onClose }) => {
  const attributes = span.attributes ?? EMPTY_ATTRIBUTES;
  const category = getSpanCategory(span);
  const genAi = useMemo(
    () => (hasGenAiData(attributes) ? getGenAiFields(attributes) : null),
    [attributes]
  );
  const groups = useMemo(() => groupAttributes(attributes), [attributes]);

  const header = (
    <>
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
          <EuiToolTip content={i18n.CLOSE_DETAIL_ARIA} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.CLOSE_DETAIL_ARIA}
              onClick={onClose}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
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
              <EuiToolTip content={i18n.COPY_SPAN_ID_ARIA} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copy"
                  aria-label={i18n.COPY_SPAN_ID_ARIA}
                  onClick={copy}
                  size="xs"
                  color="text"
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const hasAttributes =
    groups.http.length > 0 || groups.other.length > 0 || groups.resource.length > 0;

  const attributesContent = hasAttributes ? (
    <>
      {groups.http.length > 0 && (
        <AttributeSection
          id={`http-${span.span_id}`}
          title={i18n.HTTP_ATTRIBUTES_HEADING}
          rows={groups.http}
        />
      )}
      {groups.other.length > 0 && (
        <>
          {groups.http.length > 0 && <EuiSpacer size="m" />}
          <AttributeSection
            id={`other-${span.span_id}`}
            title={i18n.getOtherAttributesHeading(groups.other.length)}
            rows={groups.other}
          />
        </>
      )}
      {groups.resource.length > 0 && (
        <>
          {(groups.http.length > 0 || groups.other.length > 0) && <EuiSpacer size="m" />}
          <AttributeSection
            id={`resource-${span.span_id}`}
            title={i18n.getResourceAttributesHeading(groups.resource.length)}
            rows={groups.resource}
          />
        </>
      )}
    </>
  ) : (
    <EuiText size="s" color="subdued">
      {i18n.NO_ATTRIBUTES}
    </EuiText>
  );

  const tabs: EuiTabbedContentTab[] = [];
  if (genAi) {
    tabs.push({
      id: 'genAi',
      name: i18n.GENAI_TAB_LABEL,
      content: (
        <div style={{ padding: '8px 0' }}>
          <GenAiTab genAi={genAi} />
        </div>
      ),
    });
  }
  tabs.push({
    id: 'attributes',
    name: i18n.ATTRIBUTES_TAB_LABEL,
    content: <div style={{ padding: '8px 0' }}>{attributesContent}</div>,
  });

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      {header}
      <EuiSpacer size="s" />
      {tabs.length > 1 ? (
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />
      ) : (
        tabs[0].content
      )}
    </EuiPanel>
  );
};
