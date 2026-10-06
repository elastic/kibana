/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import {
  formatWriterMetadata,
  getDocumentStringArray,
  readKiGovernance,
  type KiGovernanceWriter,
} from './ki_detail_helpers';
import { KiDetailSidebarBreakableText, KiDetailSidebarDescriptionList } from './ki_detail_sidebar';

interface KiDetailMetadataPanelProps {
  kiId: string;
  document: KiDocument;
}

const formatWriterDescription = (writer: KiGovernanceWriter): React.ReactElement => {
  const metadataText = formatWriterMetadata(writer.metadata);
  if (metadataText.length === 0) {
    return <KiDetailSidebarBreakableText>{writer.uri}</KiDetailSidebarBreakableText>;
  }
  return (
    <>
      <KiDetailSidebarBreakableText>{writer.uri}</KiDetailSidebarBreakableText>
      <EuiText size="xs" color="subdued">
        <KiDetailSidebarBreakableText>{metadataText}</KiDetailSidebarBreakableText>
      </EuiText>
    </>
  );
};

const getDocumentString = (document: KiDocument, key: string): string | undefined => {
  const value = document[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const parseIsoDate = (value: string): Date | undefined => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const KiMetadataFormattedDate = ({ value }: { value: string }) => {
  const date = parseIsoDate(value);
  if (!date) {
    return <>{value}</>;
  }

  return (
    <EuiToolTip
      content={
        <FormattedDate
          value={date}
          year="numeric"
          month="short"
          day="2-digit"
          hour="numeric"
          minute="numeric"
          second="numeric"
        />
      }
    >
      <span tabIndex={0}>
        <FormattedRelative value={date} />
      </span>
    </EuiToolTip>
  );
};

export const KiDetailMetadataSection = ({ kiId, document }: KiDetailMetadataPanelProps) => {
  const governance = readKiGovernance(document);

  const listItems = useMemo(() => {
    const tags = getDocumentStringArray(document, 'tags');
    const items: Array<{ title: string; description: React.ReactElement | string }> = [];

    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.metadata.id', {
        defaultMessage: 'ID',
      }),
      description: <KiDetailSidebarBreakableText>{kiId}</KiDetailSidebarBreakableText>,
    });

    const description = getDocumentString(document, 'description');
    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.metadata.description', {
        defaultMessage: 'Description',
      }),
      description: description ? (
        <span data-test-subj="contextKiDetailDescription">
          <KiDetailSidebarBreakableText title={description}>
            {description}
          </KiDetailSidebarBreakableText>
        </span>
      ) : (
        <KiDetailSidebarBreakableText>
          {i18n.translate('xpack.contextEngine.kiDetail.metadata.descriptionNone', {
            defaultMessage: 'None',
          })}
        </KiDetailSidebarBreakableText>
      ),
    });

    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.metadata.tags', {
        defaultMessage: 'Tags',
      }),
      description:
        tags.length > 0 ? (
          <EuiBadgeGroup data-test-subj="contextKiDetailTagsList">
            {tags.map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ) : (
          <KiDetailSidebarBreakableText>
            {i18n.translate('xpack.contextEngine.kiDetail.metadata.tagsNone', {
              defaultMessage: 'None',
            })}
          </KiDetailSidebarBreakableText>
        ),
    });

    if (governance.lifecycleStatus) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.lifecycleStatus', {
          defaultMessage: 'Lifecycle status',
        }),
        description: (
          <KiDetailSidebarBreakableText>{governance.lifecycleStatus}</KiDetailSidebarBreakableText>
        ),
      });
    }

    const createdAt = getDocumentString(document, '@timestamp');
    if (createdAt) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.createdAt', {
          defaultMessage: 'Created at',
        }),
        description: <KiMetadataFormattedDate value={createdAt} />,
      });
    }

    const updatedAt = getDocumentString(document, 'updated_at');
    if (updatedAt) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.updatedAt', {
          defaultMessage: 'Last updated at',
        }),
        description: <KiMetadataFormattedDate value={updatedAt} />,
      });
    }

    const expiresAt = getDocumentString(document, 'expires_at');
    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.metadata.expiresAt', {
        defaultMessage: 'Expires at',
      }),
      description: expiresAt ? (
        <KiMetadataFormattedDate value={expiresAt} />
      ) : (
        <KiDetailSidebarBreakableText>
          {i18n.translate('xpack.contextEngine.kiDetail.metadata.expiresNever', {
            defaultMessage: 'Never',
          })}
        </KiDetailSidebarBreakableText>
      ),
    });

    if (governance.createdBy) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.createdBy', {
          defaultMessage: 'Created by',
        }),
        description: formatWriterDescription(governance.createdBy),
      });
    }

    if (governance.updatedBy) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.updatedBy', {
          defaultMessage: 'Updated by',
        }),
        description: formatWriterDescription(governance.updatedBy),
      });
    }

    return items;
  }, [document, governance, kiId]);

  return (
    <section data-test-subj="contextKiDetailMetadataPanel">
      <KiDetailSidebarDescriptionList
        listItems={listItems}
        data-test-subj="contextKiDetailMetadataList"
      />
    </section>
  );
};
