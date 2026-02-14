/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import type { SignificantEventItem } from '../../../../hooks/use_fetch_significant_events';
import { InfoPanel } from '../../../info_panel';
import { SparkPlot } from '../../../spark_plot';
import { SeveritySelector } from '../../../stream_detail_significant_events_view/add_significant_event_flyout/common/severity_selector';
import { SeverityBadge } from '../severity_badge/severity_badge';
import {
  BACKED_STATUS_COLUMN,
  IMPACT_COLUMN,
  LAST_OCCURRED_COLUMN,
  NOT_PROMOTED_BADGE_LABEL,
  NOT_PROMOTED_TOOLTIP_CONTENT,
  OCCURRENCES_COLUMN,
  OCCURRENCES_TOOLTIP_NAME,
  PROMOTED_BADGE_LABEL,
  PROMOTED_TOOLTIP_CONTENT,
  STREAM_COLUMN,
} from './translations';
import { formatLastOccurredAt } from './utils';
import { AssetImage } from '../../../asset_image';

interface QueryDetailsFlyoutProps {
  item: SignificantEventItem;
  isSaving: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onSave: (updatedQuery: SignificantEventItem['query'], streamName: string) => Promise<void>;
  onDelete: (queryId: string, streamName: string) => Promise<void>;
}

const DEFAULT_QUERY_PLACEHOLDER = '--';

export function QueryDetailsFlyout({
  item,
  isSaving,
  isDeleting,
  onClose,
  onSave,
  onDelete,
}: QueryDetailsFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'queryDetailsFlyoutTitle',
  });
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState(item.query.title);
  const [query, setQuery] = useState(getQueryInputValue(item));
  const [severityScore, setSeverityScore] = useState(item.query.severity_score);

  useEffect(() => {
    setIsActionsPopoverOpen(false);
    setIsDeleteModalVisible(false);
    setIsEditMode(false);
    setTitle(item.query.title);
    setQuery(getQueryInputValue(item));
    setSeverityScore(item.query.severity_score);
  }, [item]);

  const lastOccurredAt = useMemo(
    () => formatLastOccurredAt(item.occurrences, DEFAULT_QUERY_PLACEHOLDER),
    [item.occurrences]
  );
  const hasDetectedOccurrences = useMemo(
    () => item.occurrences.some((occurrence) => occurrence.y > 0),
    [item.occurrences]
  );
  const isSaveDisabled = !title.trim() || !query.trim() || isSaving;

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setTitle(item.query.title);
    setQuery(getQueryInputValue(item));
    setSeverityScore(item.query.severity_score);
  };
  const handleSaveQuery = async () => {
    await onSave(
      {
        ...item.query,
        title: title.trim(),
        kql: {
          ...item.query.kql,
          query: query.trim(),
        },
        severity_score: severityScore,
      },
      item.stream_name
    );
    setIsEditMode(false);
  };

  const infoListItems = [
    {
      title: QUERY_LABEL,
      description: (
        <EuiCodeBlock language="kql" paddingSize="none" transparentBackground>
          {getDisplayQueryValue(item)}
        </EuiCodeBlock>
      ),
    },
    {
      title: IMPACT_COLUMN,
      description: <SeverityBadge score={item.query.severity_score} />,
    },
    {
      title: LAST_OCCURRED_COLUMN,
      description: <EuiText size="s">{lastOccurredAt}</EuiText>,
    },
    {
      title: STREAM_COLUMN,
      description: <EuiBadge color="hollow">{item.stream_name}</EuiBadge>,
    },
    {
      title: BACKED_STATUS_COLUMN,
      description: (
        <EuiToolTip
          content={item.rule_backed ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
        >
          <span tabIndex={0}>
            {item.rule_backed && <EuiBadge color="hollow">{PROMOTED_BADGE_LABEL}</EuiBadge>}
            {!item.rule_backed && <EuiBadge color="warning">{NOT_PROMOTED_BADGE_LABEL}</EuiBadge>}
          </span>
        </EuiToolTip>
      ),
    },
  ];

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
        type="push"
        ownFocus={false}
        size="40%"
        hideCloseButton
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2 id={flyoutTitleId}>{item.query.title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        data-test-subj="queriesTableQueryDetailsFlyoutActionsButton"
                        iconType="boxesVertical"
                        aria-label={ACTIONS_BUTTON_ARIA_LABEL}
                        onClick={() => {
                          setIsActionsPopoverOpen((value) => !value);
                        }}
                      />
                    }
                    isOpen={isActionsPopoverOpen}
                    closePopover={() => {
                      setIsActionsPopoverOpen(false);
                    }}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          key="edit"
                          icon="pencil"
                          disabled={isEditMode}
                          onClick={() => {
                            setIsActionsPopoverOpen(false);
                            setIsEditMode(true);
                          }}
                          data-test-subj="queriesTableQueryDetailsFlyoutEditAction"
                        >
                          {EDIT_ACTION_LABEL}
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          key="delete"
                          icon={<EuiIcon type="trash" color="danger" aria-hidden={true} />}
                          css={css`
                            color: ${euiTheme.colors.danger};
                          `}
                          onClick={() => {
                            setIsActionsPopoverOpen(false);
                            setIsDeleteModalVisible(true);
                          }}
                          data-test-subj="queriesTableQueryDetailsFlyoutDeleteAction"
                        >
                          {DELETE_ACTION_LABEL}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    data-test-subj="queriesTableQueryDetailsFlyoutCloseButton"
                    iconType="cross"
                    aria-label={CLOSE_BUTTON_ARIA_LABEL}
                    onClick={onClose}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {!isEditMode && (
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <InfoPanel title={QUERY_INFORMATION_TITLE}>
                  {infoListItems.map((listItem, index) => (
                    <React.Fragment key={listItem.title}>
                      <EuiDescriptionList
                        type="column"
                        columnWidths={[1, 2]}
                        compressed
                        listItems={[listItem]}
                      />
                      {index < infoListItems.length - 1 && <EuiHorizontalRule margin="m" />}
                    </React.Fragment>
                  ))}
                </InfoPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <InfoPanel title={OCCURRENCES_COLUMN}>
                  {hasDetectedOccurrences ? (
                    <SparkPlot
                      id={`query-details-occurrences-${item.query.id}`}
                      name={OCCURRENCES_TOOLTIP_NAME}
                      type="bar"
                      timeseries={item.occurrences}
                      annotations={[]}
                      height={160}
                    />
                  ) : (
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="s"
                      alignItems="center"
                      justifyContent="center"
                      css={{ height: '100%', minHeight: '200px', padding: '30px' }}
                    >
                      <AssetImage type="barChart" size="xs" />
                      <EuiText color="subdued" size="s" textAlign="center">
                        {NO_OCCURRENCES_DESCRIPTION}
                      </EuiText>
                    </EuiFlexGroup>
                  )}
                </InfoPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {isEditMode && (
            <InfoPanel title={EDIT_QUERY_TITLE}>
              <EuiForm fullWidth component="form">
                <EuiFormRow label={QUERY_NAME_LABEL}>
                  <EuiFieldText
                    data-test-subj="queriesTableQueryDetailsFlyoutNameInput"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={isSaving}
                  />
                </EuiFormRow>
                <EuiFormRow label={QUERY_LABEL}>
                  <EuiFieldText
                    data-test-subj="queriesTableQueryDetailsFlyoutQueryInput"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    disabled={isSaving}
                  />
                </EuiFormRow>
                <EuiFormRow label={SEVERITY_LABEL}>
                  <SeveritySelector
                    severityScore={severityScore}
                    onChange={setSeverityScore}
                    disabled={isSaving}
                  />
                </EuiFormRow>
              </EuiForm>
            </InfoPanel>
          )}
        </EuiFlyoutBody>
        {isEditMode && (
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty disabled={isSaving} onClick={handleCancelEdit}>
                  {CANCEL_BUTTON_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={isSaving}
                  disabled={isSaveDisabled}
                  onClick={handleSaveQuery}
                >
                  {SAVE_BUTTON_LABEL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        )}
      </EuiFlyout>
      {isDeleteModalVisible && (
        <EuiConfirmModal
          data-test-subj="queriesTableQueryDetailsFlyoutDeleteConfirmModal"
          aria-labelledby={DELETE_MODAL_TITLE_ID}
          title={DELETE_MODAL_TITLE}
          titleProps={{ id: DELETE_MODAL_TITLE_ID }}
          onCancel={() => {
            setIsDeleteModalVisible(false);
          }}
          onConfirm={async () => {
            await onDelete(item.query.id, item.stream_name);
            setIsDeleteModalVisible(false);
          }}
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={DELETE_CONFIRM_BUTTON_LABEL}
          isLoading={isDeleting}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{DELETE_MODAL_BODY}</p>
        </EuiConfirmModal>
      )}
    </>
  );
}

function getQueryInputValue(item: SignificantEventItem) {
  if (!item.query.kql?.query) {
    return '';
  }

  return typeof item.query.kql.query === 'string'
    ? item.query.kql.query
    : JSON.stringify(item.query.kql.query);
}

function getDisplayQueryValue(item: SignificantEventItem) {
  const queryText = getQueryInputValue(item);
  return queryText || DEFAULT_QUERY_PLACEHOLDER;
}

const QUERY_INFORMATION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.queryInformationTitle',
  { defaultMessage: 'Query information' }
);

const EDIT_QUERY_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.editQueryTitle',
  { defaultMessage: 'Edit query' }
);

const QUERY_NAME_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.queryNameLabel',
  { defaultMessage: 'Query name' }
);

const QUERY_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.queryLabel',
  { defaultMessage: 'Query' }
);

const SEVERITY_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.severityLabel',
  { defaultMessage: 'Severity' }
);

const ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.actionsButtonAriaLabel',
  { defaultMessage: 'Actions' }
);

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.closeButtonAriaLabel',
  { defaultMessage: 'Close' }
);

const EDIT_ACTION_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.editActionLabel',
  { defaultMessage: 'Edit' }
);

const DELETE_ACTION_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.deleteActionLabel',
  { defaultMessage: 'Delete' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

const SAVE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.saveButtonLabel',
  { defaultMessage: 'Save' }
);

const DELETE_MODAL_TITLE_ID = 'queryDetailsFlyoutDeleteModalTitle';

const DELETE_MODAL_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.deleteModalTitle',
  { defaultMessage: 'Delete query' }
);

const DELETE_MODAL_BODY = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.deleteModalBody',
  { defaultMessage: 'Are you sure you want to delete this query? This action cannot be undone.' }
);

const DELETE_CONFIRM_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.deleteConfirmButtonLabel',
  { defaultMessage: 'Delete query' }
);

const NO_OCCURRENCES_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.noOccurrencesDescription',
  {
    defaultMessage:
      "We currently don't detect any events. You can leave it, as it might happen later or modify the query.",
  }
);
