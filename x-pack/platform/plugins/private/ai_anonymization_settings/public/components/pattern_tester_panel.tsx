/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { usePatternTester } from '../hooks/use_pattern_tester';
import type { PatternTestAnonymization } from '../hooks/use_pattern_tester';

export const DEFAULT_EXAMPLE_INPUT = JSON.stringify(
  {
    host: { name: 'web-prod-eu-04', ip: '10.42.7.19' },
    user: { name: 'CORP\\a.mehta' },
    source: { ip: '198.51.100.23' },
    destination: { ip: '10.42.8.2' },
    contact: 'a.mehta@example.com',
    message: 'Repeated login failures detected from external IP',
  },
  null,
  2
);

interface PatternTesterPanelProps {
  /** Regex rules to test with, e.g. all enabled rules, or the enabled rules plus a draft rule. */
  rules: RegexAnonymizationRule[];
  defaultInput?: string;
}

const columns: Array<EuiBasicTableColumn<PatternTestAnonymization>> = [
  {
    field: 'entityType',
    name: i18n.translate('xpack.aiAnonymizationSettings.patternTester.table.entityType', {
      defaultMessage: 'Entity type',
    }),
    render: (entityType: string) => <EuiBadge color="hollow">{entityType}</EuiBadge>,
  },
  {
    field: 'originalValue',
    name: i18n.translate('xpack.aiAnonymizationSettings.patternTester.table.originalValue', {
      defaultMessage: 'Original value',
    }),
  },
  {
    field: 'mask',
    name: i18n.translate('xpack.aiAnonymizationSettings.patternTester.table.mask', {
      defaultMessage: 'The model sees',
    }),
    width: '220px',
    truncateText: true,
    render: (mask: string) => (
      <EuiToolTip content={mask}>
        <EuiText
          size="s"
          color="accent"
          tabIndex={0}
          css={{
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {mask}
        </EuiText>
      </EuiToolTip>
    ),
  },
  {
    field: 'occurrences',
    name: i18n.translate('xpack.aiAnonymizationSettings.patternTester.table.occurrences', {
      defaultMessage: 'Occurrences',
    }),
  },
];

export const PatternTesterPanel: React.FC<PatternTesterPanelProps> = ({
  rules,
  defaultInput = DEFAULT_EXAMPLE_INPUT,
}) => {
  const [inputValue, setInputValue] = useState(defaultInput);
  const [inputError, setInputError] = useState<string | undefined>();
  const { test, result, isLoading } = usePatternTester();

  const handleTest = async () => {
    try {
      const parsedInput = JSON.parse(inputValue);
      setInputError(undefined);
      await test(parsedInput, rules);
    } catch (e) {
      setInputError(
        i18n.translate('xpack.aiAnonymizationSettings.patternTester.invalidJson', {
          defaultMessage: 'Input must be valid JSON',
        })
      );
    }
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.aiAnonymizationSettings.patternTester.inputLabel"
                      defaultMessage="Input"
                    />
                  </h3>
                </EuiTitle>
              }
              labelAppend={
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => setInputValue(defaultInput)}
                  data-test-subj="aiAnonymizationSettingsInsertExampleButton"
                >
                  <FormattedMessage
                    id="xpack.aiAnonymizationSettings.patternTester.insertExample"
                    defaultMessage="Insert an example"
                  />
                </EuiButtonEmpty>
              }
              helpText={
                <FormattedMessage
                  id="xpack.aiAnonymizationSettings.patternTester.inputHelpText"
                  defaultMessage="What the analyst sees"
                />
              }
              isInvalid={Boolean(inputError)}
              error={inputError}
              fullWidth
            >
              <CodeEditor
                languageId="json"
                height={260}
                value={inputValue}
                onChange={setInputValue}
                options={{ fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.aiAnonymizationSettings.patternTester.outputLabel"
                      defaultMessage="Output"
                    />
                  </h3>
                </EuiTitle>
              }
              labelAppend={
                <EuiCopy textToCopy={result ? JSON.stringify(result.maskedInput, null, 2) : ''}>
                  {(copy) => (
                    <EuiButtonEmpty
                      size="xs"
                      iconType="copy"
                      onClick={copy}
                      isDisabled={!result}
                      data-test-subj="aiAnonymizationSettingsCopyOutputButton"
                    >
                      <FormattedMessage
                        id="xpack.aiAnonymizationSettings.patternTester.copyOutput"
                        defaultMessage="Copy"
                      />
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              }
              helpText={
                <FormattedMessage
                  id="xpack.aiAnonymizationSettings.patternTester.outputHelpText"
                  defaultMessage="What the model receives"
                />
              }
              fullWidth
            >
              <CodeEditor
                languageId="json"
                height={260}
                value={result ? JSON.stringify(result.maskedInput, null, 2) : ''}
                onChange={() => {}}
                options={{
                  readOnly: true,
                  fontSize: 12,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="play"
              onClick={handleTest}
              isLoading={isLoading}
              data-test-subj="aiAnonymizationSettingsTestPatternButton"
            >
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternTester.testButton"
                defaultMessage="Test pattern"
              />
            </EuiButton>
          </EuiFlexItem>
          {result && (
            <>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.aiAnonymizationSettings.patternTester.valuesMasked', {
                    defaultMessage: '{count} values masked',
                    values: { count: result.stats.valuesMasked },
                  })}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.aiAnonymizationSettings.patternTester.uniqueValues', {
                    defaultMessage: '{count} unique values',
                    values: { count: result.stats.uniqueValues },
                  })}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.aiAnonymizationSettings.patternTester.rulesApplied', {
                    defaultMessage: '{count} rules applied',
                    values: { count: result.stats.rulesApplied },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {result && (
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.aiAnonymizationSettings.patternTester.resultsTitle"
                defaultMessage="What was anonymized"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiIcon type="iInCircle" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.aiAnonymizationSettings.patternTester.inMemoryNote"
                  defaultMessage="This mapping is in-memory only — discarded after each response."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiBasicTable
            items={result.anonymizations}
            columns={columns}
            tableCaption={i18n.translate(
              'xpack.aiAnonymizationSettings.patternTester.resultsTableCaption',
              { defaultMessage: 'Values anonymized by the tested patterns' }
            )}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
