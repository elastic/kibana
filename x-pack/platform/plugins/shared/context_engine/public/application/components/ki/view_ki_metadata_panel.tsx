/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPanel, EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { ViewKiAttributesSection } from './view_ki_attributes_section';
import { documentAttributesToRows } from './view_ki_helpers';
import { viewKiLoadingPanelCss } from './view_ki_loading_layout';
import { ViewKiMetadataSection } from './view_ki_metadata_section';

const hasViewKiAttributes = (document: KiDocument): boolean =>
  documentAttributesToRows(document).some((row) => row.key && row.value);

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
      <ViewKiMetadataSection kiId={kiId} document={document} />
      {showAttributes ? (
        <>
          <EuiHorizontalRule margin="m" />
          <ViewKiAttributesSection document={document} />
        </>
      ) : null}
    </EuiPanel>
  );
};
