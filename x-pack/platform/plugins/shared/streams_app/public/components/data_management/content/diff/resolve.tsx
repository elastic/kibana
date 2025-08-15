/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  ConflictResolution,
  MergeableProperties,
  MergeablePropertiesKeys,
  PropertyConflict,
} from '@kbn/content-packs-schema';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSplitPanel } from '@elastic/eui';
import { isEqual } from 'lodash';

export function Resolve({
  conflict,
  resolution,
  onResolution,
}: {
  conflict: PropertyConflict;
  resolution?: ConflictResolution;
  onResolution: (value?: MergeableProperties[MergeablePropertiesKeys]) => void;
}) {
  const [selectedVersion, setSelectedVersion] = useState<'current' | 'incoming' | undefined>(
    resolution
      ? isEqual(resolution.value, conflict.value.current)
        ? 'current'
        : isEqual(resolution.value, conflict.value.incoming)
        ? 'incoming'
        : undefined
      : undefined
  );
  return (
    <EuiSplitPanel.Outer direction="row" hasBorder={false} hasShadow={false}>
      <EuiSplitPanel.Inner>
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <b>current</b>
            </EuiFlexItem>
            {selectedVersion === 'current' && (
              <EuiFlexItem>
                <EuiIcon type="checkCircle" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiCodeBlock
            language="json"
            css={{
              ':hover': { backgroundColor: 'white', cursor: 'pointer' },
              ...(selectedVersion === 'current' ? { backgroundColor: 'white' } : {}),
            }}
            onClick={() => {
              setSelectedVersion('current');
              onResolution(conflict.value.current);
            }}
          >
            {JSON.stringify(conflict.value.current, null, 2)}
          </EuiCodeBlock>
        </>
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner>
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <b>imported</b>
            </EuiFlexItem>
            {selectedVersion === 'incoming' && (
              <EuiFlexItem>
                <EuiIcon type="checkCircle" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiCodeBlock
            language="json"
            css={{
              ':hover': { backgroundColor: 'white', cursor: 'pointer' },
              ...(selectedVersion === 'incoming' ? { backgroundColor: 'white' } : {}),
            }}
            onClick={() => {
              setSelectedVersion('incoming');
              onResolution(conflict.value.incoming);
            }}
          >
            {JSON.stringify(conflict.value.incoming, null, 2)}
          </EuiCodeBlock>
        </>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
