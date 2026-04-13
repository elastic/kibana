/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
import type { KibanaApiOperationConfig } from '@kbn/agent-builder-common/tools';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import type { KibanaOpenApiOperationSummaryDto } from '../../../../../../../common/http_api/tools';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { i18nMessages } from '../../i18n';
import type { KibanaApiToolFormData } from '../../types/tool_form_types';

function humanizeOperationId(operationId: string): string {
  return operationId
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function toOption(r: KibanaOpenApiOperationSummaryDto) {
  const title =
    (r.summary && r.summary.trim().length > 0 ? r.summary.trim() : undefined) ??
    humanizeOperationId(r.operation_id);
  return {
    label: `${r.method} ${r.path} — ${title}`,
    value: r.operation_id,
  };
}

function summaryFromRow(r: KibanaOpenApiOperationSummaryDto): string {
  if (r.description && r.description !== r.summary) {
    return r.description;
  }
  return r.summary ?? humanizeOperationId(r.operation_id);
}

function operationToOption(
  op: KibanaApiOperationConfig,
  known: ReadonlyMap<string, KibanaOpenApiOperationSummaryDto>
) {
  const row = known.get(op.operation_id);
  if (row) {
    return toOption(row);
  }
  return {
    label: `${op.method} ${op.path_template} — ${humanizeOperationId(op.operation_id)}`,
    value: op.operation_id,
  };
}

function rowToOperation(row: KibanaOpenApiOperationSummaryDto): KibanaApiOperationConfig {
  return {
    operation_id: row.operation_id,
    method: row.method,
    path_template: row.path,
  };
}

const EMPTY_OPERATIONS: KibanaApiOperationConfig[] = [];

export const KibanaApiConfiguration = () => {
  const { control, watch } = useFormContext<KibanaApiToolFormData>();
  const { toolsService } = useAgentBuilderServices();
  const [searchResults, setSearchResults] = useState<KibanaOpenApiOperationSummaryDto[]>([]);
  const [comboOptions, setComboOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [knownById, setKnownById] = useState(
    () => new Map<string, KibanaOpenApiOperationSummaryDto>()
  );
  /** Undefined when switching tool type before `operations` is merged from registry defaults. */
  const operations = watch('operations') ?? EMPTY_OPERATIONS;

  const runSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        try {
          const { results } = await toolsService.listKibanaOpenApiOperations({ q, limit: 80 });
          setSearchResults(results);
          setComboOptions(results.map(toOption));
        } catch {
          setSearchResults([]);
          setComboOptions([]);
        }
      }, 250),
    [toolsService]
  );

  useEffect(() => {
    if (searchResults.length === 0) {
      return;
    }
    setKnownById((prev) => {
      const next = new Map(prev);
      for (const r of searchResults) {
        next.set(r.operation_id, r);
      }
      return next;
    });
  }, [searchResults]);

  const operationIdsKey = operations.map((o) => o.operation_id).join('|');

  useEffect(() => {
    if (!operationIdsKey) {
      return;
    }
    setKnownById((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const op of operations) {
        if (!op.operation_id || next.has(op.operation_id)) {
          continue;
        }
        next.set(op.operation_id, {
          operation_id: op.operation_id,
          method: op.method,
          path: op.path_template,
        });
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [operationIdsKey, operations]);

  useEffect(() => {
    runSearch('');
    return () => runSearch.cancel();
  }, [runSearch]);

  const onSearchChange = useCallback(
    (searchValue: string) => {
      runSearch(searchValue);
    },
    [runSearch]
  );

  return (
    <>
      <EuiFormRow
        label={i18nMessages.configuration.form.kibanaApi.operationsLabel}
        helpText={i18nMessages.configuration.form.kibanaApi.operationsHelp}
      >
        <Controller
          control={control}
          name="operations"
          render={({ field, fieldState }) => {
            const selectedOperations = field.value ?? [];
            return (
              <EuiComboBox
                aria-label={i18nMessages.configuration.form.kibanaApi.operationsLabel}
                data-test-subj="agentBuilderKibanaApiOperationCombo"
                placeholder={i18nMessages.configuration.form.kibanaApi.operationsPlaceholder}
                isClearable
                options={comboOptions}
                selectedOptions={selectedOperations.map((op) => operationToOption(op, knownById))}
                onChange={(choices) => {
                  field.onChange(
                    choices
                      .filter(
                        (choice): choice is typeof choice & { value: string } =>
                          typeof choice.value === 'string' && choice.value.length > 0
                      )
                      .map((choice) => {
                        const row = knownById.get(choice.value);
                        if (row) {
                          return rowToOperation(row);
                        }
                        const existing = selectedOperations.find(
                          (o) => o.operation_id === choice.value
                        );
                        return (
                          existing ?? {
                            operation_id: choice.value,
                            method: '',
                            path_template: '',
                          }
                        );
                      })
                  );
                }}
                onSearchChange={onSearchChange}
                onBlur={field.onBlur}
                isInvalid={Boolean(fieldState.error)}
                fullWidth
              />
            );
          }}
        />
      </EuiFormRow>
      {operations.length > 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="agentBuilderKibanaApiSelectionSummary">
          {operations.map((op) => {
            const row = knownById.get(op.operation_id);
            const line = row ? summaryFromRow(row) : `${op.method} ${op.path_template}`.trim();
            return (
              <div key={op.operation_id}>
                <strong>{op.operation_id}</strong>
                {line ? ` — ${line}` : null}
              </div>
            );
          })}
        </EuiText>
      ) : null}
    </>
  );
};
