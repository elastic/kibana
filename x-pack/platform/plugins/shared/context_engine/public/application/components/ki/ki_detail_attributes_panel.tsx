/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { documentAttributesToRows } from './ki_detail_helpers';

interface KiDetailAttributesPanelProps {
  document: KiDocument;
}

export const KiDetailAttributesPanel = ({ document }: KiDetailAttributesPanelProps) => {
  const viewItems = useMemo(
    () =>
      documentAttributesToRows(document)
        .filter((row) => row.key.trim().length > 0)
        .map((row) => ({
          title: row.key,
          description: row.value,
        })),
    [document]
  );

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiDetailAttributesPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.attributes.title"
            defaultMessage="Attributes"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {viewItems.length > 0 ? (
        <EuiDescriptionList
          type="column"
          compressed
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
    </EuiPanel>
  );
};
