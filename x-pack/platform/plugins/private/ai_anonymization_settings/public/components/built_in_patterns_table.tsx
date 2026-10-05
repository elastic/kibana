/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { SAMPLE_VALUES_BY_ENTITY_CLASS } from '../lib/entity_classes';
import { usePatternTester } from '../hooks/use_pattern_tester';

// Wide enough for the entity prefix and a good part of the hash; the full token is in a tooltip.
// Name and entity type get fixed widths so the Pattern column takes all the remaining space.
const NAME_COLUMN_WIDTH = '20%';
const ENTITY_TYPE_COLUMN_WIDTH = '160px';
const EXAMPLE_OUTPUT_COLUMN_WIDTH = '52ch';

const truncatedTextStyles = css`
  display: block;
  max-inline-size: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const fullTextStyles = css`
  font-family: monospace;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

interface BuiltInPatternsTableProps {
  patterns: RegexAnonymizationRule[];
  onToggle: (id: string, enabled: boolean) => void;
  isSavingEnabled: boolean;
}

export const BuiltInPatternsTable: React.FC<BuiltInPatternsTableProps> = ({
  patterns,
  onToggle,
  isSavingEnabled,
}) => {
  const { test, result } = usePatternTester();

  const patternIds = patterns.map((pattern) => pattern.id).join(',');

  useEffect(() => {
    if (!patterns.length) {
      return;
    }
    const sampleInput = Object.fromEntries(
      patterns.map((pattern) => [
        pattern.id ?? pattern.entityClass,
        SAMPLE_VALUES_BY_ENTITY_CLASS[pattern.entityClass] ?? 'sample value',
      ])
    );
    // Force-enable for the preview so a disabled built-in still shows an example output.
    test(
      sampleInput,
      patterns.map((pattern) => ({ ...pattern, enabled: true }))
    );
    // Only recompute when the set of built-in patterns itself changes, not on every enable toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternIds]);

  const exampleOutputById = useMemo(() => {
    const maskedInput = result?.maskedInput as Record<string, string> | undefined;
    return maskedInput ?? {};
  }, [result]);

  const columns: Array<EuiBasicTableColumn<RegexAnonymizationRule>> = [
    {
      field: 'enabled',
      name: i18n.translate('xpack.aiAnonymizationSettings.builtInPatterns.table.enable', {
        defaultMessage: 'Enable',
      }),
      width: '80px',
      render: (enabled: boolean, item: RegexAnonymizationRule) => (
        <EuiSwitch
          showLabel={false}
          label=""
          checked={enabled}
          disabled={!isSavingEnabled}
          onChange={(e) => item.id && onToggle(item.id, e.target.checked)}
          data-test-subj={`aiAnonymizationSettingsBuiltInToggle-${item.id}`}
        />
      ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.aiAnonymizationSettings.builtInPatterns.table.name', {
        defaultMessage: 'Name (Target)',
      }),
      width: NAME_COLUMN_WIDTH,
    },
    {
      field: 'entityClass',
      name: i18n.translate('xpack.aiAnonymizationSettings.builtInPatterns.table.entityType', {
        defaultMessage: 'Entity type',
      }),
      width: ENTITY_TYPE_COLUMN_WIDTH,
      render: (entityClass: string) => <EuiBadge color="hollow">{entityClass}</EuiBadge>,
    },
    {
      field: 'pattern',
      name: i18n.translate('xpack.aiAnonymizationSettings.builtInPatterns.table.pattern', {
        defaultMessage: 'Pattern',
      }),
      // Clips the cell so the (non-wrapping) regex cannot paint over the next column.
      truncateText: true,
      render: (pattern: string, item: RegexAnonymizationRule) => (
        <EuiToolTip
          content={<span css={fullTextStyles}>{pattern}</span>}
          display="block"
          data-test-subj={`aiAnonymizationSettingsBuiltInPatternTooltip-${item.id}`}
        >
          <EuiCode css={truncatedTextStyles} tabIndex={0}>
            {pattern}
          </EuiCode>
        </EuiToolTip>
      ),
    },
    {
      name: i18n.translate('xpack.aiAnonymizationSettings.builtInPatterns.table.exampleOutput', {
        defaultMessage: 'Example Output',
      }),
      width: EXAMPLE_OUTPUT_COLUMN_WIDTH,
      truncateText: true,
      render: (item: RegexAnonymizationRule) => {
        const example = item.id ? exampleOutputById[item.id] : undefined;
        if (!example) {
          return (
            <EuiText size="s" color="accent">
              {'—'}
            </EuiText>
          );
        }
        return (
          <EuiToolTip
            content={<span css={fullTextStyles}>{example}</span>}
            display="block"
            data-test-subj={`aiAnonymizationSettingsBuiltInExampleTooltip-${item.id}`}
          >
            <EuiText size="s" color="accent" css={truncatedTextStyles} tabIndex={0}>
              {example}
            </EuiText>
          </EuiToolTip>
        );
      },
    },
  ];

  return (
    <>
      <EuiPanel color="subdued" paddingSize="m" hasShadow={false} borderRadius="m">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="eyeSlash" size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.builtInPatterns.introText"
                defaultMessage="Anonymization patterns maintained by Elastic. The token keeps the entity type as a prefix so the model knows what kind of thing it is looking at without seeing the value."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        items={patterns}
        columns={columns}
        search={{
          box: {
            placeholder: i18n.translate(
              'xpack.aiAnonymizationSettings.builtInPatterns.searchPlaceholder',
              { defaultMessage: 'Search patterns' }
            ),
          },
        }}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        itemId="id"
        tableCaption={i18n.translate('xpack.aiAnonymizationSettings.builtInPatterns.tableCaption', {
          defaultMessage: 'Built-in anonymization patterns',
        })}
        data-test-subj="aiAnonymizationSettingsBuiltInPatternsTable"
      />
    </>
  );
};
