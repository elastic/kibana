/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { FieldTypeIcon } from '../../../common/components/field_type_icon';

interface ResultsPreviewProps {
  sampleDocs: DataTableRecord[];
  mappings: MappingTypeMapping;
  index: number;
}

export const ResultsPreview: FC<ResultsPreviewProps> = ({ sampleDocs, mappings, index }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<object>>>(() => {
    if (!sampleDocs?.length) {
      return [];
    }
    const fields = Object.entries(mappings.properties ?? {}).sort(([a], [b]) => a.localeCompare(b));
    return fields.map(([name, { type }]) => {
      return {
        field: name,
        name: (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <FieldTypeIcon type={type!} tooltipEnabled={true} />
            </EuiFlexItem>
            <EuiFlexItem>{name}</EuiFlexItem>
          </EuiFlexGroup>
        ),
        dataType: 'auto',
        truncateText: { lines: 2 },
        render: (value: string) => <EuiText size="xs">{String(value)}</EuiText>,
      };
    });
  }, [mappings.properties, sampleDocs?.length]);

  const items = useMemo(() => {
    return (
      sampleDocs?.map((doc) => {
        return doc.flattened;
      }) ?? []
    );
  }, [sampleDocs]);

  return (
    <>
      {sampleDocs?.length ? (
        <EuiBasicTable
          data-test-subj={`dataVisualizerFilePreviewPanel_${index}`}
          tableLayout="auto"
          columns={columns}
          items={items}
          css={{ overflow: 'auto' }}
        />
      ) : null}
    </>
  );
};
