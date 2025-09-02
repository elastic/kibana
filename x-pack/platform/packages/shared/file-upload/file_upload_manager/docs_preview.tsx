/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord, type DataTableRecord } from '@kbn/discover-utils';
import type { AnalysisResult } from '@kbn/file-upload-common';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';

const DOC_COUNT = 10;

interface ResultsPreviewProps {
  sampleDocs: DataTableRecord[];
}

export const ResultsPreview: FC<ResultsPreviewProps> = ({ sampleDocs }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<object>>>(() => {
    if (!sampleDocs?.length) {
      return [];
    }
    const columnNames = Object.keys(sampleDocs[0].raw._source ?? {}).sort((a, b) =>
      a.localeCompare(b)
    );
    return columnNames.map((name) => {
      return {
        field: name,
        name,
        dataType: 'auto',
        truncateText: { lines: 2 },
      };
    });
  }, [sampleDocs]);

  const items = useMemo(() => {
    return (
      sampleDocs?.map((doc) => {
        return doc.flattened;
      }) || []
    );
  }, [sampleDocs]);

  return (
    <>
      {sampleDocs?.length ? (
        <EuiBasicTable
          data-test-subj="indexEditorPreviewFile"
          tableLayout="auto"
          columns={columns}
          items={items}
          css={{ overflow: 'auto' }}
        />
      ) : null}
    </>
  );
};

export async function getSampleDocs(
  data: DataPublicPluginStart,
  analysisResult: AnalysisResult,
  fileName: string
): Promise<DataTableRecord[]> {
  const docs = analysisResult.preview?.docs.filter((doc) => !doc.error);
  if (docs === undefined || docs.length === 0) {
    return [];
  }

  const tempDataView = await data.dataViews.create(
    {
      id: fileName,
      title: `temp_${fileName}`,
      allowNoIndex: true,
    },
    true,
    false
  );
  return (
    docs.slice(0, DOC_COUNT).map((doc, i) => {
      return buildDataTableRecord(
        {
          ...doc.doc,
          _id: `${fileName}-${i}`,
          _index: `temp_index_${i}`,
        } as EsHitRecord,
        tempDataView
      );
    }) ?? []
  );
}
