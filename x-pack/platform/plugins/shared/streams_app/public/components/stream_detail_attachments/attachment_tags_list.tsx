/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';

interface AttachmentTagsListProps {
  tags: string[];
}

export function AttachmentTagsList({ tags }: AttachmentTagsListProps) {
  const {
    dependencies: {
      start: {
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" wrap>
      <savedObjectsTaggingUi.components.TagList
        object={{ references: tagListToReferenceList(tags) }}
      />
    </EuiFlexGroup>
  );
}
