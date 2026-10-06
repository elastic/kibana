/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import {
  formatWriterMetadata,
  readKiGovernance,
  type KiGovernanceWriter,
} from './ki_detail_helpers';

interface KiDetailMetadataPanelProps {
  kiId: string;
  backingIndex: string;
  document: KiDocument;
}

const formatWriterDescription = (writer: KiGovernanceWriter): React.ReactElement => {
  const metadataText = formatWriterMetadata(writer.metadata);
  if (metadataText.length === 0) {
    return <>{writer.uri}</>;
  }
  return (
    <>
      {writer.uri}
      <EuiText size="xs" color="subdued">
        <p>{metadataText}</p>
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

export const KiDetailMetadataPanel = ({
  kiId,
  backingIndex,
  document,
}: KiDetailMetadataPanelProps) => {
  const governance = readKiGovernance(document);

  const listItems = useMemo(() => {
    const items: Array<{ title: string; description: React.ReactElement | string }> = [];

    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.metadata.id', {
        defaultMessage: 'ID',
      }),
      description: kiId,
    });

    items.push({
      title: i18n.translate('xpack.contextEngine.kiDetail.metadata.backingIndex', {
        defaultMessage: 'Backing index',
      }),
      description: backingIndex,
    });

    if (governance.lifecycleStatus) {
      items.push({
        title: i18n.translate('xpack.contextEngine.kiDetail.metadata.lifecycleStatus', {
          defaultMessage: 'Lifecycle status',
        }),
        description: governance.lifecycleStatus,
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
        i18n.translate('xpack.contextEngine.kiDetail.metadata.expiresNever', {
          defaultMessage: 'Never',
        })
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
  }, [backingIndex, document, governance, kiId]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiDetailMetadataPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.metadata.title"
            defaultMessage="Metadata"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        type="column"
        compressed
        listItems={listItems}
        data-test-subj="contextKiDetailMetadataList"
      />
    </EuiPanel>
  );
};
