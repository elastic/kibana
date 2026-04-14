/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInputPopover,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { KibanaApiOperationConfig } from '@kbn/agent-builder-common/tools';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import type { KibanaOpenApiOperationSummaryDto } from '../../../../../../../common/http_api/tools';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { i18nMessages } from '../../i18n';
import type { KibanaApiToolFormData } from '../../types/tool_form_types';
import { MAX_KIBANA_API_OPERATIONS } from '../../validation/kibana_api_tool_form_validation';

const SELECTABLE_LIST_HEIGHT = 280;

function humanizeOperationId(operationId: string): string {
  return operationId
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function selectableTitleFromRow(r: KibanaOpenApiOperationSummaryDto): string {
  return (
    (r.summary && r.summary.trim().length > 0 ? r.summary.trim() : undefined) ??
    humanizeOperationId(r.operation_id)
  );
}

function selectableDisplayLineFromRow(r: KibanaOpenApiOperationSummaryDto): string {
  return `${r.method} ${r.path} — ${selectableTitleFromRow(r)}`;
}

function toOption(r: KibanaOpenApiOperationSummaryDto) {
  return {
    label: selectableDisplayLineFromRow(r),
    value: r.operation_id,
  };
}

function selectableDisplayLineForOperation(
  op: KibanaApiOperationConfig,
  row: KibanaOpenApiOperationSummaryDto | undefined
): string {
  if (row) {
    return selectableDisplayLineFromRow(row);
  }
  const title = humanizeOperationId(op.operation_id);
  return `${op.method} ${op.path_template} — ${title}`.trim();
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
  const {
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<KibanaApiToolFormData>();
  const { toolsService } = useAgentBuilderServices();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KibanaOpenApiOperationSummaryDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [knownById, setKnownById] = useState(
    () => new Map<string, KibanaOpenApiOperationSummaryDto>()
  );
  const [isOperationsPopoverOpen, setIsOperationsPopoverOpen] = useState(false);
  /** Undefined when switching tool type before `operations` is merged from registry defaults. */
  const operations = watch('operations') ?? EMPTY_OPERATIONS;

  const runSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        setIsSearching(true);
        try {
          const { results } = await toolsService.listKibanaOpenApiOperations({ q, limit: 80 });
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
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

  const isAtOperationLimit = operations.length >= MAX_KIBANA_API_OPERATIONS;

  const selectableOptions: EuiSelectableOption[] = useMemo(() => {
    const selectedIds = new Set(
      operations.map((o) => o.operation_id).filter((id): id is string => id.length > 0)
    );
    return searchResults.map((r) => {
      const { label, value } = toOption(r);
      const isChecked = selectedIds.has(r.operation_id);
      return {
        key: value,
        label,
        checked: isChecked ? ('on' as const) : undefined,
        disabled: isAtOperationLimit && !isChecked,
        'data-test-subj': `agentBuilderKibanaApiOperationOption-${r.operation_id}`,
      };
    });
  }, [searchResults, operations, isAtOperationLimit]);

  const onSearchQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setSearchQuery(next);
      runSearch(next);
    },
    [runSearch]
  );

  const removeOperation = useCallback(
    (operationId: string) => {
      const current = getValues('operations') ?? [];
      setValue(
        'operations',
        current.filter((o) => o.operation_id !== operationId),
        { shouldDirty: true, shouldTouch: true, shouldValidate: true }
      );
    },
    [getValues, setValue]
  );

  const closeOperationsPopover = useCallback(() => {
    setIsOperationsPopoverOpen(false);
  }, []);

  return (
    <>
      <EuiFormRow
        label={i18nMessages.configuration.form.kibanaApi.operationsLabel}
        helpText={
          <>
            {i18nMessages.configuration.form.kibanaApi.operationsHelp}{' '}
            {i18nMessages.configuration.form.kibanaApi.operationsLimitNotice(
              MAX_KIBANA_API_OPERATIONS
            )}
          </>
        }
        isInvalid={Boolean(errors.operations)}
      >
        <Controller
          control={control}
          name="operations"
          render={({ field }) => (
            <EuiInputPopover
              data-test-subj="agentBuilderKibanaApiOperationsPopover"
              isOpen={isOperationsPopoverOpen}
              closePopover={() => {
                closeOperationsPopover();
                field.onBlur();
              }}
              disableFocusTrap
              closeOnScroll
              repositionOnScroll
              fullWidth
              panelPaddingSize="none"
              hasArrow={false}
              input={
                <EuiFieldSearch
                  aria-label={i18nMessages.configuration.form.kibanaApi.operationsSearchAriaLabel}
                  aria-expanded={isOperationsPopoverOpen}
                  role="combobox"
                  data-test-subj="agentBuilderKibanaApiOperationSearch"
                  placeholder={i18nMessages.configuration.form.kibanaApi.operationsPlaceholder}
                  value={searchQuery}
                  onChange={onSearchQueryChange}
                  onFocus={() => {
                    setIsOperationsPopoverOpen(true);
                  }}
                  onClick={() => {
                    setIsOperationsPopoverOpen(true);
                  }}
                  fullWidth
                  isLoading={isSearching}
                />
              }
            >
              <EuiSelectable
                aria-label={i18nMessages.configuration.form.kibanaApi.operationsLabel}
                data-test-subj="agentBuilderKibanaApiOperationSelectable"
                options={selectableOptions}
                isPreFiltered
                emptyMessage={i18nMessages.configuration.form.kibanaApi.operationsEmptyMessage}
                height={SELECTABLE_LIST_HEIGHT}
                listProps={{
                  onFocusBadge: false,
                  isVirtualized: searchResults.length > 24,
                }}
                onChange={(newOptions) => {
                  const idsInCurrentSearch = new Set(
                    searchResults.map((r) => r.operation_id).filter(Boolean)
                  );
                  const checkedIds = new Set(
                    newOptions
                      .filter(
                        (o) => o.checked === 'on' && o.key != null && String(o.key).length > 0
                      )
                      .map((o) => String(o.key))
                  );
                  const previous = field.value ?? [];
                  const kept = previous.filter((op) => !idsInCurrentSearch.has(op.operation_id));
                  const fromResults = searchResults
                    .filter((r) => checkedIds.has(r.operation_id))
                    .map(rowToOperation);
                  const allowedAdds = Math.max(0, MAX_KIBANA_API_OPERATIONS - kept.length);
                  const cappedFromResults = fromResults.slice(0, allowedAdds);
                  field.onChange([...kept, ...cappedFromResults]);
                }}
              >
                {(list) => (
                  <EuiPanel paddingSize="none" hasBorder hasShadow={false}>
                    {list}
                  </EuiPanel>
                )}
              </EuiSelectable>
            </EuiInputPopover>
          )}
        />
      </EuiFormRow>
      {isAtOperationLimit ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText
            size="xs"
            color="warning"
            data-test-subj="agentBuilderKibanaApiOperationsMaxNotice"
          >
            {i18nMessages.configuration.form.kibanaApi.operationsMaxReachedNotice(
              MAX_KIBANA_API_OPERATIONS
            )}
          </EuiText>
        </>
      ) : null}
      {operations.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <strong data-test-subj="agentBuilderKibanaApiSelectedHeading">
              {i18nMessages.configuration.form.kibanaApi.operationsSelectedCountOfMax(
                operations.length,
                MAX_KIBANA_API_OPERATIONS
              )}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel
            paddingSize="s"
            hasBorder
            hasShadow={false}
            grow={false}
            data-test-subj="agentBuilderKibanaApiSelectionSummary"
          >
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              {operations.map((op) => {
                const row = knownById.get(op.operation_id);
                const line = selectableDisplayLineForOperation(op, row);
                return (
                  <EuiFlexGroup
                    key={op.operation_id}
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem
                      grow
                      css={{
                        minWidth: 0,
                      }}
                    >
                      <EuiText size="s" color="default">
                        {line}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="cross"
                        size="s"
                        color="danger"
                        display="empty"
                        aria-label={i18nMessages.configuration.form.kibanaApi.operationsRemoveAriaLabel(
                          op.operation_id
                        )}
                        data-test-subj={`agentBuilderKibanaApiRemoveOperation-${op.operation_id}`}
                        onClick={() => {
                          removeOperation(op.operation_id);
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              })}
            </EuiFlexGroup>
          </EuiPanel>
        </>
      ) : null}
    </>
  );
};
