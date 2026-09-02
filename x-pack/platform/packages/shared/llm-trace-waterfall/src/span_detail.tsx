/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
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
  useEuiTheme,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { css as emotionCss } from '@emotion/react';
import {
  GEN_AI_TAB_ATTRIBUTE_KEYS,
  GenAiDetailsTable,
  GenAiTab,
  getGenAiFields,
  hasGenAiData,
  type GenAiDetailsTableRow,
} from '@kbn/apm-ui-shared';
import type { SpanNode } from './types';
import { SPAN_COLORS, getSpanCategory } from './get_span_category';
import * as i18n from './translations';

const EMPTY_ATTRIBUTES: Record<string, unknown> = {};

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
    if (GEN_AI_TAB_ATTRIBUTE_KEYS.has(field)) {
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

const attributeValueCss = emotionCss`
  word-break: break-all;
`;

const getAttributeDetailsRows = (rows: AttributeRow[]): GenAiDetailsTableRow[] =>
  rows.map(({ field, value }) => ({
    id: field,
    label: field,
    content: (
      <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" css={attributeValueCss}>
            {value}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={value}>
            {(copy) => (
              <EuiToolTip content={i18n.getCopyAttributeAriaLabel(field)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copy"
                  aria-label={i18n.getCopyAttributeAriaLabel(field)}
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
  }));

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
      <GenAiDetailsTable rows={getAttributeDetailsRows(rows)} />
    </EuiPanel>
  </EuiAccordion>
);

interface SpanDetailProps {
  span: SpanNode;
  onClose: () => void;
}

export const SpanDetail: React.FC<SpanDetailProps> = ({ span, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const attributes = span.attributes ?? EMPTY_ATTRIBUTES;
  const category = getSpanCategory(span);
  const genAi = useMemo(
    () => (hasGenAiData(attributes) ? getGenAiFields(attributes) : null),
    [attributes]
  );
  const groups = useMemo(() => groupAttributes(attributes), [attributes]);
  const tabContentCss = useMemo(
    () => css`
      padding: ${euiTheme.size.s} 0;
    `,
    [euiTheme.size.s]
  );

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

  const attributesContent = useMemo(() => {
    const hasAttributes =
      groups.http.length > 0 || groups.other.length > 0 || groups.resource.length > 0;

    return hasAttributes ? (
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
  }, [groups, span.span_id]);

  const tabs = useMemo<EuiTabbedContentTab[]>(() => {
    const items: EuiTabbedContentTab[] = [];
    if (genAi) {
      items.push({
        id: 'genAi',
        name: i18n.GENAI_TAB_LABEL,
        content: (
          <div className={tabContentCss}>
            <GenAiTab genAi={genAi} />
          </div>
        ),
      });
    }
    items.push({
      id: 'attributes',
      name: i18n.ATTRIBUTES_TAB_LABEL,
      content: <div className={tabContentCss}>{attributesContent}</div>,
    });
    return items;
  }, [attributesContent, genAi, tabContentCss]);

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
