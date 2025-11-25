/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';
import { docViewDiff } from '../components/data_management/stream_detail_enrichment/doc_viewer_diff';
import { docViewJson } from '../components/data_management/stream_detail_enrichment/doc_viewer_json';

export const useDocViewerSetup = (includeDocViewDiff = false) => {
  const { dependencies } = useKibana();
  const { unifiedDocViewer } = dependencies.start;

  return useMemo(() => {
    const docViewers = unifiedDocViewer.registry.getAll();
    const viewers = [docViewers.find((docView) => docView.id === 'doc_view_table')!, docViewJson];

    if (includeDocViewDiff) {
      viewers.push(docViewDiff);
    }

    return new DocViewsRegistry(viewers);
  }, [unifiedDocViewer.registry, includeDocViewDiff]);
};
