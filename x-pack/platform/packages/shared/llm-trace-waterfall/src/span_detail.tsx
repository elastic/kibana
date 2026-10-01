/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { GenAiTab, getGenAiFields, hasGenAiData } from '@kbn/apm-ui-shared';
import { KeyValueTable } from '@kbn/key-value-metadata-table';
import type { SpanNode } from './types';
import { SPAN_COLORS, getSpanCategory } from './get_span_category';
import * as i18n from './translations';

const EMPTY_ATTRIBUTES: Record<string, unknown> = {};

const getAttributePairs = (attributes: Record<string, unknown>) =>
  Object.entries(attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, value }));

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
  const attributePairs = useMemo(() => getAttributePairs(attributes), [attributes]);
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

  const attributesContent = useMemo(
    () =>
      attributePairs.length > 0 ? (
        <KeyValueTable keyValuePairs={attributePairs} />
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_ATTRIBUTES}
        </EuiText>
      ),
    [attributePairs]
  );

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
