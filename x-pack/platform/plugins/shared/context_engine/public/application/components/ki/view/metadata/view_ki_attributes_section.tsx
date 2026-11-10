/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { documentAttributesToRows } from './view_ki_document_helpers';
import {
  ViewKiSidebarBreakableText,
  ViewKiSidebarDescriptionList,
  ViewKiSidebarSectionTitle,
} from './view_ki_sidebar_primitives';

interface ViewKiAttributesSectionProps {
  document: KiDocument;
}

export const ViewKiAttributesSection = ({ document }: ViewKiAttributesSectionProps) => {
  const viewItems = useMemo(
    () =>
      documentAttributesToRows(document).map((row) => ({
        title: row.key,
        description: <ViewKiSidebarBreakableText>{row.value}</ViewKiSidebarBreakableText>,
      })),
    [document]
  );

  if (viewItems.length === 0) {
    return null;
  }

  return (
    <section data-test-subj="contextViewKiAttributesSection">
      <ViewKiSidebarSectionTitle>
        <FormattedMessage
          id="xpack.contextEngine.viewKi.attributes.title"
          defaultMessage="Attributes"
        />
      </ViewKiSidebarSectionTitle>
      <EuiSpacer size="s" />
      <ViewKiSidebarDescriptionList
        listItems={viewItems}
        data-test-subj="contextViewKiAttributesList"
      />
    </section>
  );
};
