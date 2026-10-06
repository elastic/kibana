/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { getDocumentStringArray } from './ki_detail_helpers';

interface KiDetailTagsPanelProps {
  document: KiDocument;
}

export const KiDetailTagsPanel = ({ document }: KiDetailTagsPanelProps) => {
  const tags = getDocumentStringArray(document, 'tags');

  if (tags.length === 0) {
    return null;
  }

  return (
    <>
      <EuiBadgeGroup data-test-subj="contextKiDetailTagsList">
        {tags.map((tag) => (
          <EuiBadge key={tag} color="hollow">
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
      <EuiSpacer size="m" />
    </>
  );
};
