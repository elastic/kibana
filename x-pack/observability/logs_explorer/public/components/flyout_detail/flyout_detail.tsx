/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogsExplorerFlyoutContentProps } from '../../customizations/types';
import { useDocDetail } from '../../hooks/use_doc_detail';
import { FlyoutHeader } from './flyout_header';
import { FlyoutHighlights } from './flyout_highlights';
import { DiscoverActionsProvider } from '../../hooks/use_discover_action';

export function FlyoutDetail({ dataView, doc, actions }: LogsExplorerFlyoutContentProps) {
  const parsedDoc = useDocDetail(doc, { dataView });

  return (
    <DiscoverActionsProvider value={actions}>
      <FlyoutHeader doc={parsedDoc} />
      <FlyoutHighlights formattedDoc={parsedDoc} flattenedDoc={doc.flattened} />
    </DiscoverActionsProvider>
  );
}
