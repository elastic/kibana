/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import type { KiGovernanceWriter } from './view_ki_helpers';
import { readKiGovernance } from './view_ki_helpers';
import { KiFormattedDate } from './ki_formatted_date';
import {
  ViewKiSidebarBreakableText,
  ViewKiSidebarDescriptionList,
  ViewKiSidebarWriterProvenance,
} from './view_ki_sidebar';

interface ViewKiMetadataSectionProps {
  kiId: string;
  document: KiDocument;
}

interface KiMetadataProvenanceRowProps {
  at?: string;
  writer?: KiGovernanceWriter;
}

const kiFormattedDateSentenceStartFirstLetterClassName = css`
  &::first-letter {
    text-transform: uppercase;
  }
`;
const KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME = `eui-displayInlineBlock ${kiFormattedDateSentenceStartFirstLetterClassName}`;

const KiMetadataProvenanceRow = ({ at, writer }: KiMetadataProvenanceRowProps) => {
  if (at && writer) {
    return (
      <span className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.contextEngine.viewKi.metadata.provenanceAtBy"
          defaultMessage="{time} by {writer}"
          values={{
            time: (
              <KiFormattedDate value={at} className={KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME} />
            ),
            writer: <ViewKiSidebarWriterProvenance writer={writer} />,
          }}
        />
      </span>
    );
  }

  if (at) {
    return <KiFormattedDate value={at} className={KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME} />;
  }

  if (writer) {
    return (
      <span className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.contextEngine.viewKi.metadata.provenanceByOnly"
          defaultMessage="by {writer}"
          values={{
            writer: <ViewKiSidebarWriterProvenance writer={writer} />,
          }}
        />
      </span>
    );
  }

  return null;
};

interface KiMetadataListItem {
  title: string;
  description: React.ReactElement | string;
}

const when = <T,>(condition: boolean, value: () => T): T[] => (condition ? [value()] : []);
const whenDefined = <T,>(value: T | undefined, build: (defined: T) => KiMetadataListItem) =>
  value !== undefined ? [build(value)] : [];

export const ViewKiMetadataSection = ({ kiId, document }: ViewKiMetadataSectionProps) => {
  const governance = readKiGovernance(document);

  const listItems = useMemo(() => {
    const tags = document.tags ?? [];
    const { description, updated_at: updatedAt, expires_at: expiresAt } = document;
    const createdAt = document['@timestamp'];

    return [
      ...whenDefined(kiId.trim, () => ({
        title: i18n.translate('xpack.contextEngine.viewKi.metadata.id', { defaultMessage: 'ID' }),
        description: <ViewKiSidebarBreakableText>{kiId}</ViewKiSidebarBreakableText>,
      })),
      ...whenDefined(description, (desc) => ({
        title: i18n.translate('xpack.contextEngine.viewKi.metadata.description', {
          defaultMessage: 'Description',
        }),
        description: (
          <span data-test-subj="contextViewKiDescription">
            <ViewKiSidebarBreakableText title={desc}>{desc}</ViewKiSidebarBreakableText>
          </span>
        ),
      })),
      ...when(createdAt !== undefined || governance.createdBy !== undefined, () => ({
        title: i18n.translate('xpack.contextEngine.viewKi.metadata.created', {
          defaultMessage: 'Created',
        }),
        description: <KiMetadataProvenanceRow at={createdAt} writer={governance.createdBy} />,
      })),
      ...when(updatedAt !== undefined || governance.updatedBy !== undefined, () => ({
        title: i18n.translate('xpack.contextEngine.viewKi.metadata.updated', {
          defaultMessage: 'Updated',
        }),
        description: <KiMetadataProvenanceRow at={updatedAt} writer={governance.updatedBy} />,
      })),
      ...whenDefined(expiresAt, (at) => ({
        title: i18n.translate('xpack.contextEngine.viewKi.metadata.expiresAt', {
          defaultMessage: 'Expires at',
        }),
        description: (
          <KiFormattedDate value={at} className={KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME} />
        ),
      })),
      ...when(tags.length > 0, () => ({
        title: i18n.translate('xpack.contextEngine.viewKi.metadata.tags', {
          defaultMessage: 'Tags',
        }),
        description: (
          <EuiBadgeGroup data-test-subj="contextViewKiTagsList">
            {tags.map((tag) => (
              <EuiBadge key={tag} color="primary">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        ),
      })),
    ] satisfies KiMetadataListItem[];
  }, [document, governance, kiId]);

  return (
    <section data-test-subj="contextViewKiMetadataSection">
      <ViewKiSidebarDescriptionList
        listItems={listItems}
        data-test-subj="contextViewKiMetadataList"
      />
    </section>
  );
};
