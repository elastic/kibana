/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
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
 * The panel's ES|QL queries. A single query shows just its editor; once there are several, each
 * gets a tab, so the section stays one editor tall however many queries there are.
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
  const hasSeveralQueries = tabs.length > 1;

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

  const addQueryButton = (
    <EuiToolTip
      content={
        canAddQuery
          ? undefined
          : i18n.translate('xpack.customContent.editFlyout.esqlSection.addQueryDisabled', {
              defaultMessage: 'Add a first query before adding more. A panel holds up to five.',
            })
      }
    >
      <EuiButtonEmpty
        size="xs"
        iconType="plusCircle"
        onClick={onAddQuery}
        isDisabled={!canAddQuery}
        data-test-subj="customContentAddQueryButton"
      >
        {i18n.translate('xpack.customContent.editFlyout.esqlSection.addQuery', {
          defaultMessage: 'Add query',
        })}
      </EuiButtonEmpty>
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
                {hasSeveralQueries
                  ? i18n.translate('xpack.customContent.editFlyout.esqlSection.titleMultiple', {
                      defaultMessage: 'Data sources (ES|QL)',
                    })
                  : i18n.translate('xpack.customContent.editFlyout.esqlSection.title', {
                      defaultMessage: 'Data source (ES|QL)',
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
      {hasSeveralQueries ? (
        <>
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
            customNewTabButton={<></>}
            createItem={() => ({ id: '', label: '' })}
            tabContentIdOverride={QUERY_TAB_CONTENT_ID}
            data-test-subj="customContentQueryTabs"
            disableInlineLabelEditing
            disableDragAndDrop
            disableTabsBarMenu
            disableCloseButton
          />
          <EuiSpacer size="xs" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.customContent.editFlyout.esqlSection.variableCaption', {
                  defaultMessage: 'Used in the template as',
                })}{' '}
                <code data-test-subj="customContentQueryVariable">{activeTab.variable}</code>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{addQueryButton}</EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>{addQueryButton}</EuiFlexItem>
        </EuiFlexGroup>
      )}

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
