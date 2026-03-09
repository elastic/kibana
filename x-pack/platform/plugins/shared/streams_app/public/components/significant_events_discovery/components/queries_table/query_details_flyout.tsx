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
  EuiDescriptionListDescription,
  EuiDescriptionList,
  EuiDescriptionListTitle,
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
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import type { StreamQuery } from '@kbn/streams-schema';
import { StreamsESQLEditor } from '../../../esql_query_editor';
import { InfoPanel } from '../../../info_panel';
import { SparkPlot } from '../../../spark_plot';
import { SeveritySelector } from '../../../stream_detail_significant_events_view/add_significant_event_flyout/common/severity_selector';
import { useFetchQueryOccurrencesChartData } from '../../../../hooks/use_fetch_queries_occurrences_chart_data';
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
  item: StreamQuery;
  unbackedQueryIds: string[];
  isSaving: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onSave: (updatedQuery: StreamQuery, streamName: string) => Promise<void>;
  onDelete: (queryId: string, streamName: string) => Promise<void>;
}

interface QueryInformationRowProps {
  title: string;
  children: React.ReactNode;
}

const DEFAULT_QUERY_PLACEHOLDER = '--';

function QueryInformationRow({ title, children }: QueryInformationRowProps) {
  return (
    <EuiDescriptionList type="column" columnWidths={[1, 2]} compressed>
      <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>{children}</EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}

export function QueryDetailsFlyout({
  item,
  unbackedQueryIds,
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
  const [title, setTitle] = useState(item.title);
  const [query, setQuery] = useState(getQueryInputValue(item));
  const [severityScore, setSeverityScore] = useState(item.severity_score);
  const { data: queryOccurrencesChartData } = useFetchQueryOccurrencesChartData({
    queryId: item.id,
  });

  useEffect(() => {
    setIsActionsPopoverOpen(false);
    setIsDeleteModalVisible(false);
    setIsEditMode(false);
    setTitle(item.title);
    setQuery(getQueryInputValue(item));
    setSeverityScore(item.severity_score);
  }, [item]);

  const lastOccurredAt = useMemo(
    () => formatLastOccurredAt(queryOccurrencesChartData?.buckets ?? [], DEFAULT_QUERY_PLACEHOLDER),
    [queryOccurrencesChartData?.buckets]
  );
  const hasDetectedOccurrences = useMemo(
    () => (queryOccurrencesChartData?.buckets ?? []).some((occurrence) => occurrence.y > 0),
    [queryOccurrencesChartData?.buckets]
  );
  const isSaveDisabled = !title.trim() || !query.trim() || isSaving;
  const primaryStreamName = item.affected_streams[0];

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setTitle(item.title);
    setQuery(getQueryInputValue(item));
    setSeverityScore(item.severity_score);
  };
  const handleSaveQuery = async () => {
    if (!primaryStreamName) {
      return;
    }

    await onSave(
      {
        ...item,
        title: title.trim(),
        esql: { query: query.trim() },
        severity_score: severityScore,
      },
      primaryStreamName
    );
    setIsEditMode(false);
  };

  const isBacked = !unbackedQueryIds.includes(item.id);
  const description = item.description?.trim();
  const model = item.model?.trim();
  const evidence = (item.evidence ?? []).map((value) => value.trim()).filter(Boolean);
  const source = item.source;

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
                <h2 id={flyoutTitleId}>{item.title}</h2>
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
                  <QueryInformationRow title={QUERY_LABEL}>
                    <EuiCodeBlock language="esql" paddingSize="none" transparentBackground>
                      {getDisplayQueryValue(item)}
                    </EuiCodeBlock>
                  </QueryInformationRow>
                  {description && (
                    <>
                      <EuiHorizontalRule margin="m" />
                      <QueryInformationRow title={DESCRIPTION_LABEL}>
                        <EuiText size="s">{description}</EuiText>
                      </QueryInformationRow>
                    </>
                  )}
                  {model && (
                    <>
                      <EuiHorizontalRule margin="m" />
                      <QueryInformationRow title={MODEL_LABEL}>
                        <EuiText size="s">{model}</EuiText>
                      </QueryInformationRow>
                    </>
                  )}
                  {evidence.length > 0 && (
                    <>
                      <EuiHorizontalRule margin="m" />
                      <QueryInformationRow title={EVIDENCE_LABEL}>
                        <EuiFlexGroup direction="column" gutterSize="xs">
                          {evidence.map((evidenceItem, index) => (
                            <Fragment key={`${evidenceItem}-${index}`}>
                              <EuiFlexItem grow={false}>
                                <EuiText size="s">{evidenceItem}</EuiText>
                              </EuiFlexItem>
                              {index < evidence.length - 1 ? (
                                <EuiHorizontalRule margin="xs" />
                              ) : null}
                            </Fragment>
                          ))}
                        </EuiFlexGroup>
                      </QueryInformationRow>
                    </>
                  )}
                  {source && (
                    <>
                      <EuiHorizontalRule margin="m" />
                      <QueryInformationRow title={SOURCE_LABEL}>
                        <EuiBadge color="hollow">{getSourceDisplayName(source)}</EuiBadge>
                      </QueryInformationRow>
                    </>
                  )}
                  <EuiHorizontalRule margin="m" />
                  <QueryInformationRow title={IMPACT_COLUMN}>
                    <SeverityBadge score={item.severity_score} />
                  </QueryInformationRow>
                  <EuiHorizontalRule margin="m" />
                  <QueryInformationRow title={LAST_OCCURRED_COLUMN}>
                    <EuiText size="s">{lastOccurredAt}</EuiText>
                  </QueryInformationRow>
                  <EuiHorizontalRule margin="m" />
                  <QueryInformationRow title={STREAM_COLUMN}>
                    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                      {item.affected_streams.map((streamName) => (
                        <EuiFlexItem grow={false} key={streamName}>
                          <EuiBadge color="hollow">{streamName}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </QueryInformationRow>
                  <EuiHorizontalRule margin="m" />
                  <QueryInformationRow title={BACKED_STATUS_COLUMN}>
                    <EuiToolTip
                      content={isBacked ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
                    >
                      <span tabIndex={0}>
                        {isBacked && <EuiBadge color="hollow">{PROMOTED_BADGE_LABEL}</EuiBadge>}
                        {!isBacked && (
                          <EuiBadge color="warning">{NOT_PROMOTED_BADGE_LABEL}</EuiBadge>
                        )}
                      </span>
                    </EuiToolTip>
                  </QueryInformationRow>
                </InfoPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <InfoPanel title={OCCURRENCES_COLUMN}>
                  {hasDetectedOccurrences ? (
                    <SparkPlot
                      id={`query-details-occurrences-${item.id}`}
                      name={OCCURRENCES_TOOLTIP_NAME}
                      type="bar"
                      timeseries={queryOccurrencesChartData?.buckets ?? []}
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
                <StreamsESQLEditor
                  query={{ esql: query }}
                  onTextLangQueryChange={(newQuery) => setQuery(newQuery.esql)}
                  onTextLangQuerySubmit={async (newQuery) => {
                    if (newQuery?.esql) setQuery(newQuery.esql);
                  }}
                  dataTestSubj="queriesTableQueryDetailsFlyoutQueryInput"
                  isDisabled={isSaving}
                />
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
            if (!primaryStreamName) {
              return;
            }

            await onDelete(item.id, primaryStreamName);
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

function getQueryInputValue(query: StreamQuery) {
  return query.esql?.query ?? '';
}

function getDisplayQueryValue(query: StreamQuery) {
  const queryText = getQueryInputValue(query);
  return queryText || DEFAULT_QUERY_PLACEHOLDER;
}

function getSourceDisplayName(source: NonNullable<StreamQuery['source']>): string {
  switch (source) {
    case 'ai_generated':
      return SOURCE_AI_GENERATED_BADGE_LABEL;
    case 'user_created':
      return SOURCE_USER_CREATED_BADGE_LABEL;
    case 'predefined':
      return SOURCE_PREDEFINED_BADGE_LABEL;
    default:
      return source;
  }
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

const DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.descriptionLabel',
  { defaultMessage: 'Description' }
);

const MODEL_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.modelLabel',
  { defaultMessage: 'Model' }
);

const EVIDENCE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.evidenceLabel',
  { defaultMessage: 'Evidence' }
);

const SOURCE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.sourceLabel',
  { defaultMessage: 'Source' }
);

const SOURCE_AI_GENERATED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.sourceAiGeneratedBadgeLabel',
  { defaultMessage: 'AI generated' }
);

const SOURCE_USER_CREATED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.sourceUserCreatedBadgeLabel',
  { defaultMessage: 'Created manually' }
);

const SOURCE_PREDEFINED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.sourcePredefinedBadgeLabel',
  { defaultMessage: 'Predefined' }
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
