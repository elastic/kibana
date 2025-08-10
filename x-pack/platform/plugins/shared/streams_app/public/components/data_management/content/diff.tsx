/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StreamDiff } from '@kbn/content-packs-schema';
import { getSegments, isChildOf, isDescendantOf } from '@kbn/streams-schema';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';

type StreamRow = StreamDiff & {
  level: number;
  isParent: boolean;
};

export function Diff({ diffs }: { diffs: StreamDiff[] }) {
  const sorted = diffs.sort((a, b) => a.name.localeCompare(b.name));
  const rows = sorted.map((entry, index) => {
    const next = sorted[index + 1];
    return {
      ...entry,
      level: getSegments(entry.name).length - 1,
      isParent: next ? isChildOf(entry.name, next.name) : false,
    };
  });

  return (
    <>
      {rows.map((row) => {
        const ancestors = rows.filter(({ name }) => isDescendantOf(name, row.name));
        const removed = ancestors.some((ancestor) =>
          ancestor.diff.removed.routing.find(({ destination }) => {
            return destination === row.name || isDescendantOf(destination, row.name);
          })
        );
        const added = ancestors.some((ancestor) =>
          ancestor.diff.added.routing.find(({ destination }) => {
            return destination === row.name || isDescendantOf(destination, row.name);
          })
        );
        const updated = !!(
          row.diff.added.fields.length ||
          row.diff.added.queries.length ||
          row.diff.added.routing.length ||
          row.diff.removed.fields.length ||
          row.diff.removed.queries.length ||
          row.diff.removed.routing.length ||
          row.diff.updated.fields.length ||
          row.diff.updated.queries.length ||
          row.diff.updated.routing.length
        );
        const color = removed ? 'danger' : added ? 'success' : updated ? 'warning' : 'default';

        return (
          <EuiFlexGroup key={row.name} style={{ marginLeft: `${row.level * 16}px` }}>
            <EuiAccordion
              id={row.name}
              buttonContent={
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText color={color}>{row.name}</EuiText>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="xs">
                      {i18n.translate('xpack.streams.contentDiff.details', {
                        defaultMessage: 'details',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              arrowDisplay="none"
            >
              <EuiPanel color="subdued">
                <EuiText size="s" color={color}>
                  {Object.entries(row.diff.added).map(([key, values]) => (
                    <>
                      <EuiText>{capitalize(key)}</EuiText>
                      <>
                        {values.map((op) => (
                          <EuiText color="success">{JSON.stringify(op)}</EuiText>
                        ))}
                      </>
                    </>
                  ))}
                </EuiText>
              </EuiPanel>
            </EuiAccordion>
          </EuiFlexGroup>
        );
      })}
    </>
  );
}
