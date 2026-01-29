/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import type { Feature } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';
import { InfoPanel } from '../../info_panel';
import { DeleteFeatureModal } from './delete_feature_modal';
import { getConfidenceColor, getStatusColor } from './use_stream_features_table';

interface FeatureDetailsFlyoutProps {
  feature: Feature;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
}

const noDataPlaceholder = '-';

export function FeatureDetailsFlyout({
  feature,
  onClose,
  onDelete,
  isDeleting = false,
}: FeatureDetailsFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'featureDetailsFlyoutTitle',
  });
  const [isActionsPopoverOpen, { off: closeActionsPopover, toggle: toggleActionsPopover }] =
    useBoolean(false);
  const [isDeleteModalVisible, { on: showDeleteModal, off: hideDeleteModal }] = useBoolean(false);

  const handleDeleteClick = () => {
    closeActionsPopover();
    showDeleteModal();
  };

  const formattedValue = Object.values(feature.value).join(', ');

  const generalInfoItems = [
    {
      title: NAME_LABEL,
      description: <EuiText size="s">{feature.name || noDataPlaceholder}</EuiText>,
    },
    {
      title: VALUE_LABEL,
      description: <EuiText size="s">{formattedValue || noDataPlaceholder}</EuiText>,
    },
    {
      title: TYPE_LABEL,
      description: <EuiBadge color="hollow">{upperFirst(feature.type)}</EuiBadge>,
    },
    {
      title: CREATED_BY_LABEL,
      description: <EuiBadge color="hollow">{CREATED_BY_LLM}</EuiBadge>,
    },
    {
      title: STATUS_LABEL,
      description: (
        <EuiHealth color={getStatusColor(feature.status)}>{upperFirst(feature.status)}</EuiHealth>
      ),
    },
    {
      title: CONFIDENCE_LABEL,
      description: (
        <EuiHealth color={getConfidenceColor(feature.confidence)}>{feature.confidence}</EuiHealth>
      ),
    },
    {
      title: TAGS_LABEL,
      description:
        feature.tags.length > 0 ? (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {feature.tags.map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiText size="s">{noDataPlaceholder}</EuiText>
        ),
    },
    {
      title: ID_LABEL,
      description: (
        <EuiText size="s" data-test-subj="streamsAppFeatureDetailsFlyoutId">
          <code
            css={css`
              font-family: ${euiTheme.font.familyCode};
              font-size: ${euiTheme.font.scale.s};
            `}
          >
            {feature.id}
          </code>
        </EuiText>
      ),
    },
    {
      title: LAST_SEEN_LABEL,
      description: <EuiText size="s">{feature.last_seen || noDataPlaceholder}</EuiText>,
    },
    {
      title: EXPIRES_AT_LABEL,
      description: (
        <EuiText size="s">{feature.expires_at ?? noDataPlaceholder}</EuiText>
      ),
    },
  ];

  return (
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
              <h2 id={flyoutTitleId}>{formattedValue}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {onDelete && (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        data-test-subj="streamsAppFeatureDetailsFlyoutActionsButton"
                        iconType="boxesVertical"
                        aria-label={ACTIONS_BUTTON_ARIA_LABEL}
                        onClick={toggleActionsPopover}
                      />
                    }
                    isOpen={isActionsPopoverOpen}
                    closePopover={closeActionsPopover}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          key="delete"
                          icon={<EuiIcon type="trash" color="danger" />}
                          css={css`
                            color: ${euiTheme.colors.danger};
                          `}
                          onClick={handleDeleteClick}
                          data-test-subj="streamsAppFeatureDetailsFlyoutDeleteAction"
                        >
                          {DELETE_ACTION_LABEL}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="streamsAppFeatureDetailsFlyoutCloseButton"
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
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <InfoPanel title={GENERAL_INFORMATION_LABEL}>
              {generalInfoItems.map((item, index) => (
                <React.Fragment key={index}>
                  <EuiDescriptionList
                    type="column"
                    columnWidths={[1, 2]}
                    compressed
                    listItems={[item]}
                  />
                  {index < generalInfoItems.length - 1 && <EuiHorizontalRule margin="m" />}
                </React.Fragment>
              ))}
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <InfoPanel title={DESCRIPTION_LABEL}>
              <EuiText>{feature.description || NO_DESCRIPTION_AVAILABLE}</EuiText>
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <InfoPanel title={EVIDENCE_LABEL}>
              {feature.evidence.length > 0 ? (
                feature.evidence.map((item, index) => (
                  <React.Fragment key={index}>
                    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiHealth color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">{item}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {index < feature.evidence.length - 1 && <EuiHorizontalRule margin="m" />}
                  </React.Fragment>
                ))
              ) : (
                <EuiText size="s">{NO_EVIDENCE_AVAILABLE}</EuiText>
              )}
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="streamsAppFeatureDetailsFlyoutMeta">
            <InfoPanel title={META_LABEL}>
              {Object.keys(feature.meta).length === 0 ? (
                <EuiText size="s">{NO_META_AVAILABLE}</EuiText>
              ) : (
                <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
                  {JSON.stringify(feature.meta, null, 2)}
                </EuiCodeBlock>
              )}
            </InfoPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      {isDeleteModalVisible && onDelete && (
        <DeleteFeatureModal
          features={[feature]}
          isLoading={isDeleting}
          onCancel={hideDeleteModal}
          onConfirm={onDelete}
        />
      )}
    </EuiFlyout>
  );
}

// i18n labels

const ID_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.idLabel', {
  defaultMessage: 'ID',
});

const NAME_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.nameLabel', {
  defaultMessage: 'Name',
});

const VALUE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.valueLabel', {
  defaultMessage: 'Value',
});

const TYPE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.typeLabel', {
  defaultMessage: 'Type',
});

const CREATED_BY_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.createdByLabel', {
  defaultMessage: 'Created by',
});

const CREATED_BY_LLM = i18n.translate('xpack.streams.featureDetailsFlyout.createdByLLM', {
  defaultMessage: 'LLM',
});

const STATUS_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.statusLabel', {
  defaultMessage: 'Status',
});

const CONFIDENCE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.confidenceLabel', {
  defaultMessage: 'Confidence',
});

const LAST_SEEN_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.lastSeenLabel', {
  defaultMessage: 'Last seen',
});

const EXPIRES_AT_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.expiresAtLabel', {
  defaultMessage: 'Expires at',
});

const TAGS_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.tagsLabel', {
  defaultMessage: 'Tags',
});

const ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.actionsButtonAriaLabel',
  { defaultMessage: 'Actions' }
);

const DELETE_ACTION_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.deleteAction', {
  defaultMessage: 'Delete',
});

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.closeButtonAriaLabel',
  { defaultMessage: 'Close' }
);

const GENERAL_INFORMATION_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.generalInformationLabel',
  { defaultMessage: 'General information' }
);

const DESCRIPTION_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.descriptionLabel', {
  defaultMessage: 'Description',
});

const NO_DESCRIPTION_AVAILABLE = i18n.translate(
  'xpack.streams.featureDetailsFlyout.noDescriptionAvailable',
  { defaultMessage: 'No description available' }
);

const EVIDENCE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.evidenceLabel', {
  defaultMessage: 'Evidence',
});

const NO_EVIDENCE_AVAILABLE = i18n.translate(
  'xpack.streams.featureDetailsFlyout.noEvidenceAvailable',
  { defaultMessage: 'No evidence available' }
);

const META_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.metaLabel', {
  defaultMessage: 'Meta',
});

const NO_META_AVAILABLE = i18n.translate(
  'xpack.streams.featureDetailsFlyout.noMetaAvailable',
  { defaultMessage: 'No meta information' }
);
