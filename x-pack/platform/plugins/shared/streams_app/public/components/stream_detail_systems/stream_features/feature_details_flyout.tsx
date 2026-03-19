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
import { getConfidenceColor } from './use_stream_features_table';

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

  const displayTitle = feature.title ?? feature.id;
  const evidence = feature.evidence?.length ? feature.evidence : [];
  const tags = feature.tags?.length && feature.tags.length > 0 ? feature.tags : [];

  const generalInfoItems = [
    {
      title: ID_LABEL,
      description: (
        <EuiText size="s" data-test-subj="streamsAppFeatureDetailsFlyoutId">
          {feature.id}
        </EuiText>
      ),
    },
    {
      title: TYPE_LABEL,
      description: <EuiBadge color="hollow">{upperFirst(feature.type)}</EuiBadge>,
    },
    {
      title: SUBTYPE_LABEL,
      description: <EuiBadge color="hollow">{feature.subtype ?? noDataPlaceholder}</EuiBadge>,
    },
    {
      title: PROPERTIES_LABEL,
      description: (
        <EuiText size="s">
          {Object.entries(feature.properties)
            .filter(([, value]) => typeof value === 'string')
            .map(([key, value]) => (
              <EuiText size="s" key={key}>
                <strong>{key}</strong> {value as string}
              </EuiText>
            ))}
        </EuiText>
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
        tags.length > 0 ? (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {tags.map((tag: string) => (
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
      title: LAST_SEEN_LABEL,
      description: <EuiText size="s">{feature.last_seen || noDataPlaceholder}</EuiText>,
    },
    {
      title: EXPIRES_AT_LABEL,
      description: <EuiText size="s">{feature.expires_at ?? noDataPlaceholder}</EuiText>,
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
              <h2 id={flyoutTitleId}>{displayTitle}</h2>
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
                    titleProps={{ css: { alignSelf: 'center' } }}
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
              {evidence.length > 0 ? (
                evidence.map((item: string, index: number) => (
                  <React.Fragment key={index}>
                    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiHealth color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">{item}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {index < evidence.length - 1 && <EuiHorizontalRule margin="m" />}
                  </React.Fragment>
                ))
              ) : (
                <EuiText size="s">{NO_EVIDENCE_AVAILABLE}</EuiText>
              )}
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="streamsAppFeatureDetailsFlyoutMeta">
            <InfoPanel title={META_LABEL}>
              {Object.keys(feature.meta ?? {}).length === 0 ? (
                <EuiText size="s">{NO_META_AVAILABLE}</EuiText>
              ) : (
                <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
                  {JSON.stringify(feature.meta ?? {}, null, 2)}
                </EuiCodeBlock>
              )}
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="streamsAppFeatureDetailsFlyoutRawDocument">
            <InfoPanel title={RAW_DOCUMENT_LABEL}>
              <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
                {JSON.stringify(feature, null, 2)}
              </EuiCodeBlock>
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

const SUBTYPE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.subtypeLabel', {
  defaultMessage: 'Subtype',
});

const PROPERTIES_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.propertiesLabel', {
  defaultMessage: 'Properties',
});

const RAW_DOCUMENT_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.rawDocumentLabel', {
  defaultMessage: 'Raw document',
});

const TYPE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.typeLabel', {
  defaultMessage: 'Type',
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

const NO_META_AVAILABLE = i18n.translate('xpack.streams.featureDetailsFlyout.noMetaAvailable', {
  defaultMessage: 'No meta information',
});
