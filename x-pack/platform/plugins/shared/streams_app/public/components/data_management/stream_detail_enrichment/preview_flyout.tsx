/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils';
import useAsync from 'react-use/lib/useAsync';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { useKibana } from '../../../hooks/use_kibana';
import { useSimulatorSelector } from './state_management/stream_enrichment_state_machine';
import { docViewJson } from './doc_viewer_json';
import { docViewDiff } from './doc_viewer_diff';

export const FLYOUT_WIDTH_KEY = 'streamsEnrichment:flyoutWidth';

export interface DataTableRecordWithIndex extends DataTableRecord {
  index: number;
}

export const PreviewFlyout = ({
  currentDoc,
  hits,
  setExpandedDoc,
}: {
  currentDoc?: DataTableRecordWithIndex;
  hits: DataTableRecordWithIndex[];
  setExpandedDoc: (doc?: DataTableRecordWithIndex) => void;
}) => {
  const streamName = useSimulatorSelector((state) => state.context.streamName);
  const { core, dependencies } = useKibana();
  const { data, unifiedDocViewer } = dependencies.start;

  const docViewsRegistry = useMemo(() => {
    const docViewers = unifiedDocViewer.registry.getAll();
    const myRegistry = new DocViewsRegistry([
      docViewers.find((docView) => docView.id === 'doc_view_table')!,
      docViewDiff,
      docViewJson,
    ]);
    return myRegistry;
  }, [unifiedDocViewer.registry]);

  const { value: streamDataView } = useAsync(() =>
    data.dataViews.create({
      title: streamName,
      timeFieldName: '@timestamp',
    })
  );

  return (
    currentDoc &&
    streamDataView && (
      <UnifiedDocViewerFlyout
        data-test-subj="esqlRowDetailsFlyout"
        flyoutWidthLocalStorageKey={FLYOUT_WIDTH_KEY}
        flyoutType={'push'}
        services={{
          toastNotifications: core.notifications.toasts,
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
