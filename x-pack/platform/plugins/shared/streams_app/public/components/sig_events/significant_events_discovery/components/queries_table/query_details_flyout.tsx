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
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { FlyoutMetadataCard } from '../../../../flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../../../flyout_components/flyout_toolbar_header';
import type { SignificantEventItem } from '../../../../../hooks/sig_events/use_fetch_significant_events';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { StreamsESQLEditor } from '../../../../esql_query_editor';
import { InfoPanel } from '../../../../info_panel';
import { SparkPlot } from '../../../../spark_plot';
import { SeveritySelector } from '../severity_selector';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { buildDiscoverParams } from '../../utils/discover_helpers';
import {
  OCCURRENCES_COLUMN,
  OCCURRENCES_TOOLTIP_NAME,
  OPEN_IN_DISCOVER_ACTION_TITLE,
} from './translations';

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
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const { timeState } = useTimefilter();
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'queryDetailsFlyoutTitle',
  });
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState(item.query.title);
  const [description, setDescription] = useState(item.query.description ?? '');
  const [query, setQuery] = useState(getQueryInputValue(item));
  const [severityScore, setSeverityScore] = useState(item.query.severity_score);

  useEffect(() => {
    setIsActionsPopoverOpen(false);
    setIsDeleteModalVisible(false);
    setIsEditMode(false);
    setTitle(item.query.title);
    setDescription(item.query.description ?? '');
    setQuery(getQueryInputValue(item));
    setSeverityScore(item.query.severity_score);
  }, [item]);

  const isSaveDisabled = !title.trim() || !query.trim() || isSaving;

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setTitle(item.query.title);
    setDescription(item.query.description ?? '');
    setQuery(getQueryInputValue(item));
    setSeverityScore(item.query.severity_score);
  };
  const handleSaveQuery = async () => {
    await onSave(
      {
        ...item.query,
        title: title.trim(),
        description: description.trim(),
        esql: { query: query.trim() },
        severity_score: severityScore,
      },
      item.stream_name
    );
    setIsEditMode(false);
  };

  const generalInfoItems = [
    {
      title: TYPE_LABEL,
      description: <EuiBadge color="hollow">{QUERY_TYPE_BADGE_LABEL}</EuiBadge>,
    },
    {
      title: DESCRIPTION_LABEL,
      description: (
        <EuiText size="s">{item.query.description || DEFAULT_QUERY_PLACEHOLDER}</EuiText>
      ),
    },
    {
      title: SEVERITY_DETAILS_LABEL,
      description: <SeverityBadge score={item.query.severity_score} />,
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
        {/* First header: minimal toolbar with actions and close */}
        <FlyoutToolbarHeader>
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={ACTIONS_BUTTON_ARIA_LABEL}
              button={
                <EuiButtonIcon
                  data-test-subj="queriesTableQueryDetailsFlyoutActionsButton"
                  iconType="boxesVertical"
                  aria-label={ACTIONS_BUTTON_ARIA_LABEL}
                  onClick={() => setIsActionsPopoverOpen((value) => !value)}
                />
              }
              isOpen={isActionsPopoverOpen}
              closePopover={() => setIsActionsPopoverOpen(false)}
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
        </FlyoutToolbarHeader>

        {/* Second header: title and metadata cards */}
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{item.query.title}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem>
              <FlyoutMetadataCard title={SEVERITY_DETAILS_LABEL}>
                <SeverityBadge score={item.query.severity_score} />
              </FlyoutMetadataCard>
            </EuiFlexItem>
            <EuiFlexItem>
              <FlyoutMetadataCard title={TYPE_LABEL}>
                <EuiBadge color="hollow">{QUERY_TYPE_BADGE_LABEL}</EuiBadge>
              </FlyoutMetadataCard>
            </EuiFlexItem>
            <EuiFlexItem>
              <FlyoutMetadataCard title={STREAM_LABEL}>
                <EuiBadge color="hollow" iconType="productStreamsClassic" iconSide="left">
                  {item.stream_name}
                </EuiBadge>
              </FlyoutMetadataCard>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {!isEditMode && (
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <InfoPanel title={GENERAL_INFORMATION_TITLE}>
                  {generalInfoItems.map((listItem, index) => (
                    <React.Fragment key={listItem.title}>
                      <EuiDescriptionList
                        type="column"
                        columnWidths={[1, 2]}
                        compressed
                        listItems={[listItem]}
                      />
                      {index < generalInfoItems.length - 1 && <EuiHorizontalRule margin="m" />}
                    </React.Fragment>
                  ))}
                </InfoPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <InfoPanel
                  title={QUERY_PANEL_TITLE}
                  headerRightContent={
                    discoverLocator ? (
                      <EuiButtonEmpty
                        size="xs"
                        iconType="discoverApp"
                        iconSide="left"
                        onClick={() =>
                          discoverLocator.navigate(buildDiscoverParams(item.query, timeState))
                        }
                      >
                        {OPEN_IN_DISCOVER_ACTION_TITLE}
                      </EuiButtonEmpty>
                    ) : undefined
                  }
                >
                  <EuiCodeBlock language="esql" isCopyable paddingSize="m">
                    {getQueryInputValue(item) || DEFAULT_QUERY_PLACEHOLDER}
                  </EuiCodeBlock>
                </InfoPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <InfoPanel title={OCCURRENCES_COLUMN}>
                  <SparkPlot
                    id={`query-details-occurrences-${item.query.id}`}
                    name={OCCURRENCES_TOOLTIP_NAME}
                    type="bar"
                    timeseries={item.occurrences}
                    annotations={[]}
                    height={160}
                  />
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
                <EuiFormRow label={DESCRIPTION_LABEL}>
                  <EuiTextArea
                    data-test-subj="queriesTableQueryDetailsFlyoutDescriptionInput"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSaving}
                    rows={2}
                    resize="vertical"
                    placeholder={DESCRIPTION_PLACEHOLDER}
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
  return item.query.esql?.query ?? '';
}

const STREAM_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.streamLabel',
  { defaultMessage: 'Stream' }
);

const GENERAL_INFORMATION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.generalInformationTitle',
  { defaultMessage: 'General information' }
);

const TYPE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.typeLabel',
  { defaultMessage: 'Type' }
);

const QUERY_TYPE_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.queryTypeBadgeLabel',
  { defaultMessage: 'Query' }
);

const EDIT_QUERY_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.editQueryTitle',
  { defaultMessage: 'Edit query' }
);

const QUERY_NAME_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.queryNameLabel',
  { defaultMessage: 'Query name' }
);

const QUERY_PANEL_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.queryLabel',
  { defaultMessage: 'Query' }
);

const DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.descriptionLabel',
  { defaultMessage: 'Description' }
);

const DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.descriptionPlaceholder',
  { defaultMessage: 'Describe what this query detects and why it matters' }
);

const SEVERITY_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.severityLabel',
  { defaultMessage: 'Severity' }
);

const SEVERITY_DETAILS_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.severityDetailsLabel',
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
