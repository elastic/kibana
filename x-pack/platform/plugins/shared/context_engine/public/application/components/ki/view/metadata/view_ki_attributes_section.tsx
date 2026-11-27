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
import { KiFormattedDate } from '../../shared/ki_formatted_date';
import { KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME } from '../view_ki_constants';
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
      documentAttributesToRows(document).map((row) => {
        const description =
          row.isDate && row.value.length > 0 ? (
            <KiFormattedDate
              value={row.value}
              className={KI_FORMATTED_DATE_SENTENCE_START_CLASS_NAME}
              data-test-subj="contextViewKiAttributeDate"
            />
          ) : (
            <ViewKiSidebarBreakableText>{row.value}</ViewKiSidebarBreakableText>
          );

        return {
          title: row.label,
          description,
        };
      }),
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
