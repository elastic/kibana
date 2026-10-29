/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from '@kbn/custom-content-common';
import type { TabItem } from '@kbn/unified-tabs';
import { UnifiedTabs } from '@kbn/unified-tabs';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { EsqlDataResult } from '@kbn/custom-content-renderer';
import type { DraftQuery } from '../hooks/flyout_reducer';
import { getServices } from '../services';
import { EsqlQueryEditor } from './esql_query_editor';

const MAIN_QUERY_KEY = 'main';
const QUERY_TAB_CONTENT_ID = 'customContentQueryTabContent';

// The flyout pads its body by `--euiFlyoutBodyPadding`; pulling the tab bar out by the same amount
// makes it run from one edge of the flyout to the other, like the Lens flyout's tabs.
const fullWidthTabsCss = css({ marginInline: 'calc(var(--euiFlyoutBodyPadding, 0px) * -1)' });

/** The "…" menu of a tab. A tab that cannot be removed has no menu. */
const QueryTabMenu = ({ position, onRemove }: { position: number; onRemove: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const label = i18n.translate('xpack.customContent.editFlyout.esqlSection.queryActions', {
    defaultMessage: 'Actions for query {position}',
    values: { position },
  });

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={label}
      button={
        // Hidden while the menu is open, or it stays on screen above the menu it opened.
        <EuiToolTip content={isOpen ? undefined : label} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            color="text"
            size="xs"
            aria-label={label}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`customContentQueryActions-${position}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="remove"
            icon="trash"
            onClick={() => {
              setIsOpen(false);
              onRemove();
            }}
            data-test-subj={`customContentRemoveQuery-${position}`}
          >
            {i18n.translate('xpack.customContent.editFlyout.esqlSection.removeQuery', {
              defaultMessage: 'Remove query',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

interface QueryTab {
  key: string;
  /** What the template reads this query's rows as: `rows` for the first, `queries[n].rows` for the rest. */
  variable: string;
  text: string;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  onTextChange: (text: string) => void;
  onFetchData: () => void;
  onRemove?: () => void;
}

export interface EsqlDataSectionProps {
  esqlQuery: string;
  onEsqlQueryChange: (q: string) => void;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  onFetchData: () => void;
  renderError: string | null;
  additionalQueries: DraftQuery[];
  canAddQuery: boolean;
  onAddQuery: () => void;
  onRemoveQuery: (id: number) => void;
  onQueryTextChange: (id: number, text: string) => void;
  onFetchQueryData: (id: number) => void;
  esqlVariables?: ESQLControlVariable[];
}

/**
 * The panel's ES|QL queries, one tab each. The tab bar is always there, even for a single query, so
 * the layout does not shift as queries are added, and it stays one editor tall however many there are.
 */
export const EsqlDataSection = ({
  esqlQuery,
  onEsqlQueryChange,
  isDataLoading,
  esqlData,
  esqlDataError,
  onFetchData,
  renderError,
  additionalQueries,
  canAddQuery,
  onAddQuery,
  onRemoveQuery,
  onQueryTextChange,
  onFetchQueryData,
  esqlVariables,
}: EsqlDataSectionProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'customContentEsql' });
  const [selectedKey, setSelectedKey] = useState(MAIN_QUERY_KEY);

  const tabs: QueryTab[] = [
    {
      key: MAIN_QUERY_KEY,
      variable: 'rows',
      text: esqlQuery,
      isDataLoading,
      esqlData,
      esqlDataError,
      onTextChange: onEsqlQueryChange,
      onFetchData,
    },
    ...additionalQueries.map((draft, index) => ({
      key: `query-${draft.id}`,
      variable: `queries[${index + 1}].rows`,
      text: draft.text,
      isDataLoading: draft.isDataLoading,
      esqlData: draft.esqlData,
      esqlDataError: draft.esqlDataError,
      onTextChange: (text: string) => onQueryTextChange(draft.id, text),
      onFetchData: () => onFetchQueryData(draft.id),
      onRemove: () => onRemoveQuery(draft.id),
    })),
  ];
  // The selected tab is gone once it was removed; fall back to the first query.
  const activeTab = tabs.find(({ key }) => key === selectedKey) ?? tabs[0];

  const tabItems: TabItem[] = tabs.map((tab, index) => ({
    id: tab.key,
    label: i18n.translate('xpack.customContent.editFlyout.esqlSection.queryTab', {
      defaultMessage: 'Query {position}',
      values: { position: index + 1 },
    }),
    // An empty element keeps the default tab menu (rename, duplicate, …) away from the first query.
    customMenuButton: tab.onRemove ? (
      <QueryTabMenu position={index + 1} onRemove={tab.onRemove} />
    ) : (
      <></>
    ),
  }));

  // A query that was just added is the one to type into.
  const previousCountRef = useRef(additionalQueries.length);
  useEffect(() => {
    if (additionalQueries.length > previousCountRef.current) {
      setSelectedKey(`query-${additionalQueries[additionalQueries.length - 1].id}`);
    }
    previousCountRef.current = additionalQueries.length;
  }, [additionalQueries]);

  const addQueryLabel = i18n.translate('xpack.customContent.editFlyout.esqlSection.addQuery', {
    defaultMessage: 'Add query',
  });
  // The "+" at the end of the tab row. It sits in the bar's own new-tab slot, which the bar hides
  // once the panel holds as many queries as it can.
  const addQueryButton = (
    <EuiToolTip
      content={
        canAddQuery
          ? addQueryLabel
          : i18n.translate('xpack.customContent.editFlyout.esqlSection.addQueryDisabled', {
              defaultMessage: 'Add a first query before adding more.',
            })
      }
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="plus"
        color="text"
        aria-label={addQueryLabel}
        onClick={onAddQuery}
        isDisabled={!canAddQuery}
        data-test-subj="customContentAddQueryButton"
      />
    </EuiToolTip>
  );

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="customContentEsqlSection"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="database" size="s" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.customContent.editFlyout.esqlSection.title', {
                  defaultMessage: 'Data sources (ES|QL)',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.customContent.editFlyout.esqlSection.optional', {
            defaultMessage: 'Optional',
          })}
        </EuiText>
      }
      paddingSize="none"
    >
      {renderError && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            title={i18n.translate('xpack.customContent.editFlyout.esqlSection.previewError', {
              defaultMessage: 'Preview failed',
            })}
            data-test-subj="customContentRenderError"
          >
            {renderError}
          </KbnDangerCallout>
        </>
      )}

      <EuiSpacer size="xs" />
      <div css={fullWidthTabsCss}>
        <UnifiedTabs
          items={tabItems}
          selectedItemId={activeTab.key}
          recentlyClosedItems={[]}
          onClearRecentlyClosed={() => {}}
          maxItemsCount={CUSTOM_CONTENT_MAX_ESQL_QUERIES}
          services={{ core: { chrome: getServices().core.chrome } }}
          // Only the selection changes here: tabs are added, removed and renamed by our own controls.
          onChanged={({ selectedItem }) => setSelectedKey(selectedItem?.id ?? MAIN_QUERY_KEY)}
          onEBTEvent={() => {}}
          customNewTabButton={addQueryButton}
          createItem={() => ({ id: '', label: '' })}
          tabContentIdOverride={QUERY_TAB_CONTENT_ID}
          disableInlineLabelEditing
          disableDragAndDrop
          disableTabsBarMenu
          disableCloseButton
        />
      </div>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.customContent.editFlyout.esqlSection.variableCaption', {
          defaultMessage: 'Used in the template as',
        })}{' '}
        <code data-test-subj="customContentQueryVariable">{activeTab.variable}</code>
      </EuiText>

      <div id={QUERY_TAB_CONTENT_ID}>
        <EsqlQueryEditor
          key={activeTab.key}
          esqlQuery={activeTab.text}
          onEsqlQueryChange={activeTab.onTextChange}
          isDataLoading={activeTab.isDataLoading}
          esqlData={activeTab.esqlData}
          esqlDataError={activeTab.esqlDataError}
          onFetchData={activeTab.onFetchData}
          esqlVariables={esqlVariables}
        />
      </div>
    </EuiAccordion>
  );
};
