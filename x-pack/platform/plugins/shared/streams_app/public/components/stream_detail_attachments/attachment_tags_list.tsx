/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';

const MAX_VISIBLE_TAGS = 2;

interface AttachmentTagsListProps {
  tags: string[];
  showAll?: boolean;
}

export function AttachmentTagsList({ tags, showAll = false }: AttachmentTagsListProps) {
  const {
    dependencies: {
      start: {
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();

  const visibleTags = showAll ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingCount = Math.max(0, tags.length - MAX_VISIBLE_TAGS);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <savedObjectsTaggingUi.components.TagList
          object={{ references: tagListToReferenceList(visibleTags) }}
        />
      </EuiFlexItem>
      {!showAll && remainingCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            title={i18n.translate('xpack.streams.attachmentTagsList.moreTagsTitle', {
              defaultMessage: '{count} more {count, plural, one {tag} other {tags}}',
              values: { count: remainingCount },
            })}
          >
            +{remainingCount}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
