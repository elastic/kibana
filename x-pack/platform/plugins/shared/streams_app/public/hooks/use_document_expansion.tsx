/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DataTableRecordWithIndex } from '../components/data_management/shared';

export const useDocumentExpansion = (hits: DataTableRecordWithIndex[]) => {
  const [currentDoc, setExpandedDoc] = useState<DataTableRecordWithIndex | undefined>(undefined);

  const currentDocRef = useRef<DataTableRecordWithIndex | undefined>(currentDoc);
  currentDocRef.current = currentDoc;
  const hitsRef = useRef<DataTableRecordWithIndex[]>(hits);
  hitsRef.current = hits;

  // Calculate selected row index from current document
  const selectedRowIndex = hits.findIndex((hit) => hit === currentDoc);

  const onRowSelected = useCallback((rowIndex: number) => {
    if (currentDocRef.current && hitsRef.current[rowIndex] === currentDocRef.current) {
      // If the same row is clicked, collapse the flyout
      setExpandedDoc(undefined);
      return;
    }
    // Expand the clicked row
    setExpandedDoc(hitsRef.current[rowIndex]);
  }, []);

  useEffect(() => {
    if (currentDoc) {
      // If a current doc is set but not in the hits, update it to point to the newly mapped hit with the same index
      const hit = hits.find((h) => h.index === currentDoc.index);
      if (hit && hit !== currentDoc) {
        setExpandedDoc(hit);
      } else if (!hit && currentDoc) {
        // If the current doc is not found in the hits, reset it
        setExpandedDoc(undefined);
      }
    }
  }, [currentDoc, hits]);

  return {
    currentDoc,
    selectedRowIndex,
    onRowSelected,
    setExpandedDoc,
  };
};
