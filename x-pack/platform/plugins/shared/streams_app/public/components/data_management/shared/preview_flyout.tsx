/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';

export const FLYOUT_WIDTH_KEY = 'streamsEnrichment:flyoutWidth';

export interface DataTableRecordWithIndex extends DataTableRecord {
  index: number;
}

export const PreviewFlyout = ({
  currentDoc,
  hits,
  setExpandedDoc,
  docViewsRegistry,
  streamName,
  streamDataView,
}: {
  currentDoc?: DataTableRecordWithIndex;
  hits: DataTableRecordWithIndex[];
  setExpandedDoc: (doc?: DataTableRecordWithIndex) => void;
  docViewsRegistry: DocViewsRegistry;
  streamName: string;
  streamDataView?: DataView;
}) => {
  const { core } = useKibana();

  return (
    currentDoc &&
    streamDataView && (
      <UnifiedDocViewerFlyout
        data-test-subj="esqlRowDetailsFlyout"
        flyoutWidthLocalStorageKey={FLYOUT_WIDTH_KEY}
        flyoutType={'push'}
        services={{
          toastNotifications: core.notifications.toasts,
          chrome: core.chrome,
        }}
        isEsqlQuery={false}
        hit={currentDoc}
        hits={hits}
        dataView={streamDataView}
        docViewsRegistry={docViewsRegistry}
        columns={[]}
        onAddColumn={() => {}}
        onRemoveColumn={() => {}}
        onClose={() => {
          setExpandedDoc(undefined);
        }}
        setExpandedDoc={(doc) => {
          // find the expanded document in the hits array
          const expandedDoc = hits.find((hit) => hit.id === doc?.id);
          // if the document is found, set it as the expanded document
          if (expandedDoc) {
            setExpandedDoc(expandedDoc);
          }
        }}
      />
    )
  );
};
