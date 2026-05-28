/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
  type HeaderBadge,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { KI_ATTACHMENT_TYPE } from '@kbn/streams-schema';
import {
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  type KnowledgeIndicatorAttachmentData,
} from '@kbn/streams-schema';

type KnowledgeIndicatorAttachment = Attachment<
  typeof KI_ATTACHMENT_TYPE,
  KnowledgeIndicatorAttachmentData
>;

const labels = {
  pillFallback: i18n.translate('xpack.streams.knowledgeIndicatorAttachment.pillFallback', {
    defaultMessage: 'Knowledge indicator',
  }),
  unknownKind: i18n.translate('xpack.streams.knowledgeIndicatorAttachment.unknownKind', {
    defaultMessage: 'Unknown knowledge indicator',
  }),
  unknownKindDescription: i18n.translate(
    'xpack.streams.knowledgeIndicatorAttachment.unknownKindDescription',
    {
      defaultMessage:
        'This knowledge indicator was created with a payload shape this version of the app does not understand. Try re-attaching it.',
    }
  ),
  featureBadge: i18n.translate('xpack.streams.knowledgeIndicatorAttachment.featureBadge', {
    defaultMessage: 'Feature',
  }),
  queryBadge: i18n.translate('xpack.streams.knowledgeIndicatorAttachment.queryBadge', {
    defaultMessage: 'Query',
  }),
  ruleBackedBadge: i18n.translate('xpack.streams.knowledgeIndicatorAttachment.ruleBackedBadge', {
    defaultMessage: 'Rule-backed',
  }),
  noContent: i18n.translate('xpack.streams.knowledgeIndicatorAttachment.noContent', {
    defaultMessage: 'No content available — the underlying knowledge indicator may be unavailable.',
  }),
};

const FeatureCard = ({
  data,
}: {
  data: Extract<KnowledgeIndicatorAttachmentData, { kind: 'feature' }>;
}) => {
  const { feature, stream_name: streamName } = data;
  const tags = feature.tags ?? [];
  const title = feature.title ?? feature.id;
  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.streams.knowledgeIndicatorAttachment.feature.streamLabel"
          defaultMessage="Stream: {streamName}"
          values={{ streamName }}
        />
      </EuiText>
      {feature.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">{feature.description}</EuiText>
        </>
      )}
      {(feature.type || feature.subtype) && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {feature.type && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{feature.type}</EuiBadge>
              </EuiFlexItem>
            )}
            {feature.subtype && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{feature.subtype}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
      {tags.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="accent">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {feature.last_seen && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.streams.knowledgeIndicatorAttachment.feature.lastSeenLabel"
              defaultMessage="Last seen: {lastSeen}"
              values={{ lastSeen: feature.last_seen }}
            />
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

const QueryCard = ({
  data,
}: {
  data: Extract<KnowledgeIndicatorAttachmentData, { kind: 'query' }>;
}) => {
  const { query, stream_name: streamName, rule } = data;
  const title = query.title ?? query.id;
  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.streams.knowledgeIndicatorAttachment.query.streamLabel"
          defaultMessage="Stream: {streamName}"
          values={{ streamName }}
        />
      </EuiText>
      {query.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">{query.description}</EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable overflowHeight={240}>
        {query.esql.query}
      </EuiCodeBlock>
      {rule.backed && (
        <>
          <EuiSpacer size="xs" />
          <EuiBadge color="success">{labels.ruleBackedBadge}</EuiBadge>
        </>
      )}
    </EuiPanel>
  );
};

const KnowledgeIndicatorContent = ({
  attachment,
}: AttachmentRenderProps<KnowledgeIndicatorAttachment>) => {
  const { data } = attachment;
  if (!data) {
    return (
      <EuiCallOut
        announceOnMount={false}
        color="warning"
        title={labels.noContent}
        iconType="warning"
        size="s"
      />
    );
  }
  if (data.kind === KI_ORIGIN_KIND_FEATURE) {
    return <FeatureCard data={data} />;
  }
  if (data.kind === KI_ORIGIN_KIND_QUERY) {
    return <QueryCard data={data} />;
  }
  return (
    <EuiCallOut
      announceOnMount={false}
      color="warning"
      title={labels.unknownKind}
      iconType="warning"
      size="s"
    >
      <p>{labels.unknownKindDescription}</p>
    </EuiCallOut>
  );
};

const getTitle = (data: KnowledgeIndicatorAttachmentData | undefined): string => {
  if (!data) return labels.pillFallback;
  if (data.kind === KI_ORIGIN_KIND_FEATURE) {
    return data.feature.title ?? data.feature.id;
  }
  // Symmetric with the feature branch: `query.title` is `NonEmptyString` in the
  // current schema but defensive code means a future schema relaxation or a
  // hand-crafted attachment can't render an empty pill.
  return data.query.title ?? data.query.id;
};

export const knowledgeIndicatorAttachmentDefinition: AttachmentUIDefinition<KnowledgeIndicatorAttachment> =
  {
    getLabel: (attachment) => getTitle(attachment.data) || labels.pillFallback,
    getIcon: () => 'bell',
    getHeader: ({ attachment }) => {
      const { data } = attachment;
      const badges: HeaderBadge[] = [];
      if (data?.kind === KI_ORIGIN_KIND_FEATURE) {
        badges.push({ label: labels.featureBadge, color: 'hollow' });
      } else if (data?.kind === KI_ORIGIN_KIND_QUERY) {
        badges.push({ label: labels.queryBadge, color: 'hollow' });
        if (data.rule.backed) {
          badges.push({ label: labels.ruleBackedBadge, color: 'success' });
        }
      }
      return {
        icon: 'bell',
        subtitle: data?.stream_name,
        badges,
      };
    },
    renderInlineContent: (props) => <KnowledgeIndicatorContent {...props} />,
  };
