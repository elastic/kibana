/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiCallOut,
  EuiAccordion,
  EuiFormRow,
  EuiSelect,
  EuiFieldText,
  EuiTextArea,
  EuiSwitch,
  EuiRange,
  EuiBadge,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiIcon,
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { CodeEditor } from '@kbn/code-editor';

interface QueryBuilderProps {
  initialQuery?: string;
  initialPlatform?: 'linux' | 'windows' | 'darwin';
  onQueryChange: (query: string) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
  onTest?: (query: string, platform: string) => Promise<any>;
  showAdvancedOptions?: boolean;
  readOnly?: boolean;
}

interface OsqueryTable {
  name: string;
  description: string;
  platform: string[];
  columns: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }>;
  examples: string[];
}

interface QuerySuggestion {
  label: string;
  kind: monaco.languages.CompletionItemKind;
  insertText: string;
  detail: string;
  documentation?: string;
}

interface QueryValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

const OSQUERY_TABLES: OsqueryTable[] = [
  {
    name: 'processes',
    description: 'All running processes on the host.',
    platform: ['linux', 'windows', 'darwin'],
    columns: [
      { name: 'pid', type: 'INTEGER', description: 'Process ID' },
      { name: 'name', type: 'TEXT', description: 'Process name' },
      { name: 'path', type: 'TEXT', description: 'Path to process binary' },
      { name: 'cmdline', type: 'TEXT', description: 'Complete command line' },
      { name: 'state', type: 'TEXT', description: 'Process state' },
      { name: 'cwd', type: 'TEXT', description: 'Current working directory' },
      { name: 'root', type: 'TEXT', description: 'Process root directory' },
      { name: 'uid', type: 'BIGINT', description: 'User ID' },
      { name: 'gid', type: 'BIGINT', description: 'Group ID' },
      { name: 'euid', type: 'BIGINT', description: 'Effective user ID' },
      { name: 'egid', type: 'BIGINT', description: 'Effective group ID' },
    ],
    examples: [
      'SELECT * FROM processes WHERE name = "chrome";',
      'SELECT pid, name, cmdline FROM processes WHERE path LIKE "%/bin/%";',
      'SELECT COUNT(*) as process_count FROM processes;',
    ],
  },
  {
    name: 'file',
    description: 'Interactive filesystem attributes and metadata.',
    platform: ['linux', 'windows', 'darwin'],
    columns: [
      { name: 'path', type: 'TEXT', description: 'Absolute file path', required: true },
      { name: 'directory', type: 'TEXT', description: 'Directory of file' },
      { name: 'filename', type: 'TEXT', description: 'Name portion of file path' },
      { name: 'size', type: 'BIGINT', description: 'Size of file in bytes' },
      { name: 'atime', type: 'BIGINT', description: 'Last access time' },
      { name: 'mtime', type: 'BIGINT', description: 'Last modification time' },
      { name: 'ctime', type: 'BIGINT', description: 'Creation time' },
      { name: 'type', type: 'TEXT', description: 'File type' },
    ],
    examples: [
      'SELECT * FROM file WHERE path = "/etc/passwd";',
      'SELECT path, size FROM file WHERE directory = "/tmp/" AND size > 1000000;',
      'SELECT COUNT(*) FROM file WHERE path LIKE "/home/%/.ssh/%";',
    ],
  },
  {
    name: 'users',
    description: 'Local system users.',
    platform: ['linux', 'windows', 'darwin'],
    columns: [
      { name: 'uid', type: 'BIGINT', description: 'User ID' },
      { name: 'gid', type: 'BIGINT', description: 'Group ID' },
      { name: 'username', type: 'TEXT', description: 'Username' },
      { name: 'description', type: 'TEXT', description: 'Optional user description' },
      { name: 'directory', type: 'TEXT', description: 'User home directory' },
      { name: 'shell', type: 'TEXT', description: 'User default shell' },
    ],
    examples: [
      'SELECT * FROM users WHERE uid = 0;',
      'SELECT username, directory FROM users WHERE shell LIKE "%bash";',
      'SELECT COUNT(*) as user_count FROM users;',
    ],
  },
  {
    name: 'registry',
    description: 'Windows registry keys and values.',
    platform: ['windows'],
    columns: [
      { name: 'key', type: 'TEXT', description: 'Registry key path', required: true },
      { name: 'name', type: 'TEXT', description: 'Registry value name' },
      { name: 'type', type: 'TEXT', description: 'Registry value type' },
      { name: 'data', type: 'TEXT', description: 'Registry value data' },
    ],
    examples: [
      'SELECT * FROM registry WHERE key = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run";',
      'SELECT name, data FROM registry WHERE key LIKE "HKEY_CURRENT_USER\\Software\\%";',
    ],
  },
  {
    name: 'startup_items',
    description: 'Applications that are started on boot.',
    platform: ['linux', 'darwin'],
    columns: [
      { name: 'name', type: 'TEXT', description: 'Startup item name' },
      { name: 'path', type: 'TEXT', description: 'Path to startup item' },
      { name: 'args', type: 'TEXT', description: 'Arguments passed to startup item' },
      { name: 'type', type: 'TEXT', description: 'Startup item type' },
      { name: 'source', type: 'TEXT', description: 'Source of startup item' },
    ],
    examples: [
      'SELECT * FROM startup_items;',
      'SELECT name, path FROM startup_items WHERE type = "Startup Item";',
    ],
  },
];

/**
 * Advanced osquery query builder with syntax highlighting, auto-completion,
 * validation, and platform-specific table assistance.
 */
export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  initialQuery = '',
  initialPlatform = 'linux',
  onQueryChange,
  onValidationChange,
  onTest,
  showAdvancedOptions = true,
  readOnly = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState(initialPlatform);
  const [validation, setValidation] = useState<QueryValidation>({
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  });
  const [isTestPopoverOpen, setIsTestPopoverOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');

  // Filter tables by platform
  const availableTables = useMemo(() => {
    return OSQUERY_TABLES.filter(table => table.platform.includes(platform));
  }, [platform]);

  // Generate query suggestions based on current context
  const generateSuggestions = useCallback((query: string, position: number): QuerySuggestion[] => {
    const suggestions: QuerySuggestion[] = [];

    // Table name suggestions
    if (query.toLowerCase().includes('from ') || query.toLowerCase().includes('join ')) {
      availableTables.forEach(table => {
        suggestions.push({
          label: table.name,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: table.name,
          detail: table.description,
          documentation: `Columns: ${table.columns.map(c => c.name).join(', ')}`,
        });
      });
    }

    // Column suggestions based on selected tables
    const tableMatches = query.match(/FROM\s+(\w+)/gi);
    if (tableMatches) {
      tableMatches.forEach(match => {
        const tableName = match.replace(/FROM\s+/i, '');
        const table = OSQUERY_TABLES.find(t => t.name === tableName);
        if (table) {
          table.columns.forEach(column => {
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column.name,
              detail: `${column.type} - ${column.description}`,
            });
          });
        }
      });
    }

    // SQL keyword suggestions
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'LIKE', 'IN', 'EXISTS', 
                     'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 
                     'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
    
    keywords.forEach(keyword => {
      suggestions.push({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        detail: 'SQL Keyword',
      });
    });

    return suggestions;
  }, [availableTables]);

  // Validate query syntax and logic
  const validateQuery = useCallback((queryText: string): QueryValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!queryText.trim()) {
      return { isValid: false, errors: ['Query cannot be empty'], warnings: [], suggestions: [] };
    }

    // Basic SQL syntax validation
    const trimmedQuery = queryText.trim().toLowerCase();
    
    if (!trimmedQuery.startsWith('select')) {
      errors.push('Query must start with SELECT statement');
    }

    if (!trimmedQuery.includes('from ')) {
      errors.push('Query must include FROM clause');
    }

    // Check for valid table names
    const fromMatch = queryText.match(/FROM\s+(\w+)/i);
    if (fromMatch) {
      const tableName = fromMatch[1];
      const table = OSQUERY_TABLES.find(t => t.name === tableName);
      
      if (!table) {
        errors.push(`Unknown table: ${tableName}`);
      } else if (!table.platform.includes(platform)) {
        warnings.push(`Table '${tableName}' is not available on ${platform} platform`);
      }
    }

    // Check for potential performance issues
    if (queryText.includes('*') && !queryText.toLowerCase().includes('limit')) {
      warnings.push('SELECT * without LIMIT may return large result sets');
      suggestions.push('Consider adding LIMIT clause to improve performance');
    }

    // Check for required WHERE clauses on certain tables
    const interactiveTables = ['file', 'registry'];
    if (fromMatch) {
      const tableName = fromMatch[1];
      if (interactiveTables.includes(tableName) && !trimmedQuery.includes('where ')) {
        errors.push(`Table '${tableName}' requires WHERE clause with constraints`);
      }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /\/\*.*\*\//g, message: 'Block comments may indicate SQL injection attempt' },
      { pattern: /;\s*drop/gi, message: 'DROP statements are not allowed' },
      { pattern: /;\s*delete/gi, message: 'DELETE statements are not allowed' },
      { pattern: /;\s*update/gi, message: 'UPDATE statements are not allowed' },
    ];

    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(queryText)) {
        errors.push(message);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }, [platform]);

  // Handle query changes
  useEffect(() => {
    const newValidation = validateQuery(query);
    setValidation(newValidation);
    onValidationChange(newValidation.isValid, newValidation.errors);
    onQueryChange(query);
  }, [query, validateQuery, onValidationChange, onQueryChange]);

  // Handle test query execution
  const handleTestQuery = useCallback(async () => {
    if (!onTest || !validation.isValid) return;

    setIsTestLoading(true);
    setTestResults(null);

    try {
      const results = await onTest(query, platform);
      setTestResults(results);
    } catch (error) {
      setTestResults({
        error: error.message || 'Test execution failed',
      });
    } finally {
      setIsTestLoading(false);
    }
  }, [query, platform, validation.isValid, onTest]);

  // Insert example query
  const insertExample = useCallback((exampleQuery: string) => {
    setQuery(exampleQuery);
  }, []);

  // Insert table template
  const insertTableTemplate = useCallback((tableName: string) => {
    const table = OSQUERY_TABLES.find(t => t.name === tableName);
    if (!table) return;

    const requiredColumns = table.columns.filter(c => c.required);
    const sampleColumns = table.columns.slice(0, 3).map(c => c.name).join(', ');
    
    let template = `SELECT ${sampleColumns} FROM ${tableName}`;
    
    if (requiredColumns.length > 0) {
      const constraints = requiredColumns.map(col => `${col.name} = ""`).join(' AND ');
      template += ` WHERE ${constraints}`;
    }
    
    template += ';';
    setQuery(template);
  }, []);

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.osquery.compliance.queryBuilder.title', {
            defaultMessage: 'Osquery Builder',
          })}
        </h3>
      </EuiTitle>
      
      <EuiSpacer size="m" />

      {/* Platform Selection */}
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFormRow 
            label="Target Platform"
            display="columnCompressed"
          >
            <EuiSelect
              options={[
                { value: 'linux', text: 'Linux' },
                { value: 'windows', text: 'Windows' },
                { value: 'darwin', text: 'macOS' },
              ]}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
              compressed
              disabled={readOnly}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {availableTables.length} tables available
          </EuiBadge>
        </EuiFlexItem>

        <EuiFlexItem />

        {onTest && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButton
                  size="s"
                  iconType="play"
                  fill
                  isLoading={isTestLoading}
                  isDisabled={!validation.isValid || readOnly}
                  onClick={() => setIsTestPopoverOpen(true)}
                >
                  Test Query
                </EuiButton>
              }
              isOpen={isTestPopoverOpen}
              closePopover={() => setIsTestPopoverOpen(false)}
              panelPaddingSize="m"
              anchorPosition="downRight"
            >
              <div style={{ width: 400 }}>
                <EuiText size="s">
                  <p>Execute this query against a test environment to validate syntax and preview results.</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty 
                      size="s" 
                      onClick={() => setIsTestPopoverOpen(false)}
                    >
                      Cancel
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton 
                      size="s" 
                      fill 
                      onClick={handleTestQuery}
                      isLoading={isTestLoading}
                    >
                      Execute Test
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Query Editor */}
      <EuiFormRow
        label="SQL Query"
        helpText="Write your osquery SQL statement. Use Ctrl+Space for autocomplete."
        isInvalid={!validation.isValid}
        error={validation.errors}
      >
        <CodeEditor
          languageId="sql"
          value={query}
          onChange={setQuery}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            folding: true,
            wordWrap: 'on',
            automaticLayout: true,
          }}
          height={200}
          languageConfiguration={{
            autoIndent: 'advanced',
            brackets: [['(', ')'], ['[', ']']],
            autoClosingPairs: [
              { open: '(', close: ')' },
              { open: '[', close: ']' },
              { open: "'", close: "'" },
              { open: '"', close: '"' },
            ],
          }}
        />
      </EuiFormRow>

      {/* Validation Messages */}
      {validation.warnings.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut title="Warnings" color="warning" size="s">
            <ul>
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </EuiCallOut>
        </>
      )}

      {validation.suggestions.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut title="Suggestions" color="primary" size="s">
            <ul>
              {validation.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </EuiCallOut>
        </>
      )}

      {/* Test Results */}
      {testResults && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title="Test Results"
            color={testResults.error ? "danger" : "success"}
            size="s"
          >
            {testResults.error ? (
              <EuiText size="s" color="danger">
                <p>{testResults.error}</p>
              </EuiText>
            ) : (
              <EuiText size="s">
                <p>
                  Query executed successfully. 
                  {testResults.rowCount && ` Returned ${testResults.rowCount} rows.`}
                </p>
              </EuiText>
            )}
          </EuiCallOut>
        </>
      )}

      {/* Advanced Options */}
      {showAdvancedOptions && (
        <>
          <EuiSpacer size="m" />
          
          <EuiAccordion 
            id="queryBuilderAdvanced"
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="gear" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">Query Assistant & Templates</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiSpacer size="m" />
            
            {/* Table Browser */}
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow label="Available Tables" display="columnCompressed">
                  <EuiSelect
                    options={[
                      { value: '', text: 'Select a table...' },
                      ...availableTables.map(table => ({
                        value: table.name,
                        text: `${table.name} - ${table.description}`,
                      })),
                    ]}
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    compressed
                  />
                </EuiFormRow>
              </EuiFlexItem>
              
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace display="columnCompressed">
                  <EuiButton
                    size="s"
                    onClick={() => insertTableTemplate(selectedTable)}
                    disabled={!selectedTable || readOnly}
                  >
                    Insert Template
                  </EuiButton>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            {/* Selected Table Details */}
            {selectedTable && (
              <>
                <EuiSpacer size="s" />
                {(() => {
                  const table = OSQUERY_TABLES.find(t => t.name === selectedTable);
                  if (!table) return null;

                  return (
                    <EuiPanel color="subdued" paddingSize="s">
                      <EuiText size="s">
                        <h4>{table.name}</h4>
                        <p>{table.description}</p>
                        <strong>Columns:</strong>
                        <ul>
                          {table.columns.slice(0, 6).map(col => (
                            <li key={col.name}>
                              <code>{col.name}</code> ({col.type}) - {col.description}
                              {col.required && <EuiBadge color="warning">Required</EuiBadge>}
                            </li>
                          ))}
                          {table.columns.length > 6 && (
                            <li><em>... and {table.columns.length - 6} more columns</em></li>
                          )}
                        </ul>
                      </EuiText>
                    </EuiPanel>
                  );
                })()}
              </>
            )}

            {/* Example Queries */}
            {selectedTable && (
              <>
                <EuiSpacer size="m" />
                <EuiText size="s">
                  <h4>Example Queries:</h4>
                </EuiText>
                <EuiSpacer size="s" />
                
                {(() => {
                  const table = OSQUERY_TABLES.find(t => t.name === selectedTable);
                  if (!table) return null;

                  return (
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {table.examples.map((example, index) => (
                        <EuiFlexItem key={index}>
                          <EuiPanel color="subdued" paddingSize="s">
                            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                              <EuiFlexItem>
                                <EuiText size="s">
                                  <code>{example}</code>
                                </EuiText>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty 
                                  size="xs" 
                                  onClick={() => insertExample(example)}
                                  disabled={readOnly}
                                >
                                  Use
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiPanel>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  );
                })()}
              </>
            )}
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
};