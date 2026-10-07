/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import type { KiGovernanceWriter } from './ki_detail_helpers';
import { getDocumentStringArray, readKiGovernance } from './ki_detail_helpers';
import {
  KiDetailSidebarBreakableText,
  KiDetailSidebarDescriptionList,
  KiDetailSidebarWriterProvenance,
} from './ki_detail_sidebar';

interface KiDetailMetadataPanelProps {
  kiId: string;
  document: KiDocument;
}

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

interface KiMetadataProvenanceRowProps {
  at?: string;
  writer?: KiGovernanceWriter;
}

const KiMetadataProvenanceRow = ({ at, writer }: KiMetadataProvenanceRowProps) => {
  if (at && writer) {
    return (
      <span className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.contextEngine.kiDetail.metadata.provenanceAtBy"
          defaultMessage="{time} by {writer}"
          values={{
            time: <KiMetadataFormattedDate value={at} />,
            writer: <KiDetailSidebarWriterProvenance writer={writer} />,
          }}
        />
      </span>
    );
  }

  if (at) {
    return <KiMetadataFormattedDate value={at} />;
  }

  if (writer) {
    return (
      <span className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.contextEngine.kiDetail.metadata.provenanceByOnly"
          defaultMessage="by {writer}"
          values={{
            writer: <KiDetailSidebarWriterProvenance writer={writer} />,
          }}
        />
      </span>
    );
  }

  return null;
};

export const KiDetailMetadataSection = ({ kiId, document }: KiDetailMetadataPanelProps) => {
  const governance = readKiGovernance(document);

  const listItems = useMemo(() => {
    const tags = getDocumentStringArray(document, 'tags');
    const items: Array<{ title: string; description: React.ReactElement | string }> = [];

    if (kiId.trim().length > 0) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.id', {
          defaultMessage: 'ID',
        }),
        description: <KiDetailSidebarBreakableText>{kiId}</KiDetailSidebarBreakableText>,
      });
    }

    const description = getDocumentString(document, 'description');
    if (description) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.description', {
          defaultMessage: 'Description',
        }),
        description: (
          <span data-test-subj="contextKiDetailDescription">
            <KiDetailSidebarBreakableText title={description}>
              {description}
            </KiDetailSidebarBreakableText>
          </span>
        ),
      });
    }

    const createdAt = getDocumentString(document, '@timestamp');
    if (createdAt || governance.createdBy) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.created', {
          defaultMessage: 'Created',
        }),
        description: <KiMetadataProvenanceRow at={createdAt} writer={governance.createdBy} />,
      });
    }

    const updatedAt = getDocumentString(document, 'updated_at');
    if (updatedAt || governance.updatedBy) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.updated', {
          defaultMessage: 'Updated',
        }),
        description: <KiMetadataProvenanceRow at={updatedAt} writer={governance.updatedBy} />,
      });
    }

    const expiresAt = getDocumentString(document, 'expires_at');
    if (expiresAt) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.expiresAt', {
          defaultMessage: 'Expires at',
        }),
        description: <KiMetadataFormattedDate value={expiresAt} />,
      });
    }

    if (tags.length > 0) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.tags', {
          defaultMessage: 'Tags',
        }),

        // default
        // hollow
        // primary
        // success
        // accent
        // warning
        // danger
        description: (
          <EuiBadgeGroup data-test-subj="contextKiDetailTagsList">
            {tags.map((tag) => (
              <EuiBadge key={tag} color="primary">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
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
