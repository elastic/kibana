/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPanel, EuiSkeletonText } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { viewKiLoadingPanelCss } from '../view_ki_constants';
import { ViewKiAttributesSection } from './view_ki_attributes_section';
import { documentAttributesToRows, readKiGovernance } from './view_ki_document_helpers';
import { ViewKiSidebarDescriptionList } from './view_ki_sidebar_primitives';
import { buildKiMetadataListItems } from './view_ki_metadata_helpers';

const hasViewKiAttributes = (document: KiDocument): boolean =>
  documentAttributesToRows(document).length > 0;

interface ViewKiMetadataPanelProps {
  kiId: string;
  document?: KiDocument;
  isLoading?: boolean;
}

export const ViewKiMetadataPanel = ({
  kiId,
  document,
  isLoading = false,
}: ViewKiMetadataPanelProps) => {
  const showAttributes = document ? hasViewKiAttributes(document) : false;
  const governance = readKiGovernance(document ?? {});
  const listItems = useMemo(
    () => buildKiMetadataListItems(kiId, document ?? {}, governance),
    [document, governance, kiId]
  );

  if (isLoading || !document) {
    return (
      <EuiPanel
        hasBorder
        grow={false}
        paddingSize="m"
        css={viewKiLoadingPanelCss}
        data-test-subj="contextViewKiMetadataPanel"
      >
        <EuiSkeletonText size="s" lines={6} data-test-subj="contextViewKiMetadataLoading" />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder grow={false} paddingSize="m" data-test-subj="contextViewKiMetadataPanel">
      <section data-test-subj="contextViewKiMetadataSection">
        <ViewKiSidebarDescriptionList
          listItems={listItems}
          data-test-subj="contextViewKiMetadataList"
        />
      </section>
      {showAttributes ? (
        <>
          <EuiHorizontalRule margin="m" />
          <ViewKiAttributesSection document={document} />
        </>
      ) : null}
    </EuiPanel>
  );
};
