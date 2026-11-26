/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type {
  KiDocument,
  KiPrivilegeGroup,
} from '../../../../../../common/http_api/knowledge_indicators';
import { KiFormattedDate } from '../../shared/ki_formatted_date';
import type { KiGovernanceView } from './view_ki_document_helpers';
import { KiMetadataProvenanceRow } from './view_ki_metadata_provenance_row';
import { KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME } from '../view_ki_constants';
import { ViewKiSidebarBreakableText } from './view_ki_sidebar_primitives';
export interface KiMetadataListItem {
  title: string;
  description: React.ReactElement | string;
}

export const when = <T,>(condition: boolean, value: () => T): T[] => (condition ? [value()] : []);
export const whenDefined = <T,>(value: T | undefined, build: (defined: T) => KiMetadataListItem) =>
  value !== undefined ? [build(value)] : [];

const distinctVisibleSpaces = (privileges: KiPrivilegeGroup[]): string[] => [
  ...new Set(privileges.map((privilege) => privilege.space).filter((space) => space !== '*')),
];

export const buildKiMetadataListItems = (
  kiId: string,
  document: KiDocument,
  governance: KiGovernanceView
): KiMetadataListItem[] => {
  const tags = Array.isArray(document.tags) ? document.tags : [];
  const { description, updated_at: updatedAt, expires_at: expiresAt } = document;
  const createdAt = document['@timestamp'];
  const privileges = document.permissions?.kibana?.privileges ?? [];
  const visibleInAllSpaces =
    privileges.length === 0 || privileges.some((privilege) => privilege.space === '*');
  const visibleInSpaces = distinctVisibleSpaces(privileges);

  return [
    ...whenDefined(kiId, () => ({
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
    {
      title: i18n.translate('xpack.contextEngine.viewKi.metadata.visibleIn', {
        defaultMessage: 'Visible in',
      }),
      description: (
        <span data-test-subj="contextViewKiVisibleIn">
          {visibleInAllSpaces ? (
            i18n.translate('xpack.contextEngine.viewKi.metadata.visibleInAllSpaces', {
              defaultMessage: 'All spaces',
            })
          ) : (
            <EuiBadgeGroup>
              {visibleInSpaces.map((space) => (
                <EuiBadge key={space} color="hollow">
                  {space}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          )}
        </span>
      ),
    },
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
  ];
};
