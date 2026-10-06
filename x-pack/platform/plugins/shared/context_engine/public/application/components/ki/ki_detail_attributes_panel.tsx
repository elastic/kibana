/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { documentAttributesToRows } from './ki_detail_helpers';
import {
  KiDetailSidebarBreakableText,
  KiDetailSidebarDescriptionList,
  KiDetailSidebarSectionTitle,
} from './ki_detail_sidebar';

interface KiDetailAttributesPanelProps {
  document: KiDocument;
}

export const KiDetailAttributesSection = ({ document }: KiDetailAttributesPanelProps) => {
  const viewItems = useMemo(
    () =>
      documentAttributesToRows(document)
        .filter((row) => row.key.trim().length > 0)
        .map((row) => ({
          title: row.key,
          description: <KiDetailSidebarBreakableText>{row.value}</KiDetailSidebarBreakableText>,
        })),
    [document]
  );

  return (
    <section data-test-subj="contextKiDetailAttributesPanel">
      <KiDetailSidebarSectionTitle>
        <FormattedMessage
          id="xpack.contextEngine.kiDetail.attributes.title"
          defaultMessage="Attributes"
        />
      </KiDetailSidebarSectionTitle>
      <EuiSpacer size="s" />
      {viewItems.length > 0 ? (
        <KiDetailSidebarDescriptionList
          listItems={viewItems}
          data-test-subj="contextKiDetailAttributesList"
        />
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="contextKiDetailAttributesEmpty">
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.attributes.empty"
            defaultMessage="No attributes"
          />
        </EuiText>
      )}
    </section>
  );
};
