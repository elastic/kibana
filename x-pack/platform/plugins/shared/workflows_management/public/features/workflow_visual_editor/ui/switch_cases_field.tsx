/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

export interface SwitchCaseFormValue {
  readonly match: string | number | boolean;
  readonly steps?: readonly unknown[];
}

export interface SwitchCaseRow {
  readonly id: string;
  readonly match: string;
  readonly steps: readonly unknown[];
}

const newRowId = (): string =>
  `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const toSwitchCaseRows = (value: unknown): SwitchCaseRow[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const rec = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const match = rec.match;
    return {
      id: `case-${index}`,
      match: match === undefined || match === null ? '' : String(match),
      steps: Array.isArray(rec.steps) ? rec.steps : [],
    };
  });
};

export const switchCaseRowsToValue = (rows: readonly SwitchCaseRow[]): SwitchCaseFormValue[] =>
  rows.map((row) => ({
    match: row.match,
    steps: [...row.steps],
  }));

/** Trimmed, case-insensitive duplicate key for live warnings. */
export const switchCaseDuplicateKey = (match: string): string => match.trim().toLowerCase();

export const findDuplicateCaseIds = (rows: readonly SwitchCaseRow[]): ReadonlySet<string> => {
  const counts = new Map<string, string[]>();
  for (const row of rows) {
    const key = switchCaseDuplicateKey(row.match);
    if (key) {
      const list = counts.get(key) ?? [];
      list.push(row.id);
      counts.set(key, list);
    }
  }
  const dupes = new Set<string>();
  for (const ids of counts.values()) {
    if (ids.length > 1) {
      for (const id of ids) dupes.add(id);
    }
  }
  return dupes;
};

/** Counts configured steps under a case (nested children included). */
export const countConfiguredSteps = (steps: unknown): number => {
  if (!Array.isArray(steps)) return 0;
  let total = 0;
  const configuredSteps = steps.filter(
    (step): step is Record<string, unknown> => Boolean(step) && typeof step === 'object'
  );
  for (const rec of configuredSteps) {
    total += 1;
    total += countConfiguredSteps(rec.steps);
    total += countConfiguredSteps(rec.else);
    total += countConfiguredSteps(rec.fallback);
    total += countConfiguredSteps(rec.default);
    if (Array.isArray(rec.cases)) {
      for (const c of rec.cases) {
        if (c && typeof c === 'object') {
          total += countConfiguredSteps((c as { steps?: unknown }).steps);
        }
      }
    }
    if (Array.isArray(rec.branches)) {
      for (const b of rec.branches) {
        if (b && typeof b === 'object') {
          total += countConfiguredSteps((b as { steps?: unknown }).steps);
        }
      }
    }
  }
  return total;
};

export interface SwitchCasesFieldProps {
  readonly value: unknown;
  readonly onChange: (next: SwitchCaseFormValue[]) => void;
}

export function SwitchCasesField({ value, onChange }: SwitchCasesFieldProps) {
  const { euiTheme } = useEuiTheme();
  const deleteModalTitleId = useGeneratedHtmlId({ prefix: 'workflowSwitchCaseDeleteTitle' });
  const [rows, setRows] = useState<SwitchCaseRow[]>(() => toSwitchCaseRows(value));
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SwitchCaseRow | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const valueFingerprint = useMemo(() => JSON.stringify(value ?? null), [value]);

  // Sync from parent when the fragment changes externally (Apply / reopen). The fingerprint is the
  // value as JSON, so the rows are rebuilt from it and the effect depends on nothing else.
  useEffect(() => {
    setRows((prev) => {
      const incoming = toSwitchCaseRows(JSON.parse(valueFingerprint));
      if (
        JSON.stringify(switchCaseRowsToValue(prev)) ===
        JSON.stringify(switchCaseRowsToValue(incoming))
      ) {
        return prev;
      }
      return incoming.map((row, index) => ({
        ...row,
        id: prev[index]?.id ?? newRowId(),
      }));
    });
  }, [valueFingerprint]);

  useEffect(() => {
    if (!focusRowId) return;
    const el = inputRefs.current.get(focusRowId);
    if (el) {
      el.focus();
      el.select();
    }
    setFocusRowId(null);
  }, [focusRowId, rows]);

  const duplicateIds = useMemo(() => findDuplicateCaseIds(rows), [rows]);

  const emit = useCallback(
    (next: SwitchCaseRow[]) => {
      setRows(next);
      onChange(switchCaseRowsToValue(next));
    },
    [onChange]
  );

  const handleAdd = useCallback(() => {
    const id = newRowId();
    emit([...rows, { id, match: '', steps: [] }]);
    setFocusRowId(id);
  }, [emit, rows]);

  const handleMatchChange = useCallback(
    (id: string, match: string) => {
      emit(rows.map((row) => (row.id === id ? { ...row, match } : row)));
    },
    [emit, rows]
  );

  const commitDelete = useCallback(
    (row: SwitchCaseRow) => {
      emit(rows.filter((r) => r.id !== row.id));
      setPendingDelete(null);
    },
    [emit, rows]
  );

  const requestDelete = useCallback(
    (row: SwitchCaseRow) => {
      if (countConfiguredSteps(row.steps) > 0) {
        setPendingDelete(row);
        return;
      }
      commitDelete(row);
    },
    [commitDelete]
  );

  const pendingStepCount = pendingDelete ? countConfiguredSteps(pendingDelete.steps) : 0;
  const pendingLabel =
    pendingDelete?.match.trim() ||
    i18n.translate('workflows.switchCasesField.emptyCaseLabel', {
      defaultMessage: '(empty)',
    });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('workflows.switchCasesField.label', {
          defaultMessage: 'Cases',
        })}
        fullWidth
      >
        <div
          data-test-subj="workflowSwitchCasesField"
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: euiTheme.size.s,
          }}
        >
          {rows.map((row, index) => {
            const isDuplicate = duplicateIds.has(row.id);
            const deleteCaseLabel = i18n.translate('workflows.switchCasesField.deleteAriaLabel', {
              defaultMessage: 'Delete case {index}',
              values: { index: index + 1 },
            });

            return (
              <div key={row.id} data-test-subj={`workflowSwitchCaseRow-${index}`}>
                <EuiFlexGroup gutterSize="none" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow>
                    <EuiFormRow
                      fullWidth
                      isInvalid={isDuplicate}
                      error={
                        isDuplicate
                          ? i18n.translate('workflows.switchCasesField.duplicateWarning', {
                              defaultMessage:
                                'Duplicate value — only the first matching case will run.',
                            })
                          : undefined
                      }
                    >
                      <EuiFieldText
                        compressed
                        fullWidth
                        value={row.match}
                        isInvalid={isDuplicate}
                        placeholder={i18n.translate('workflows.switchCasesField.matchPlaceholder', {
                          defaultMessage: 'Match value',
                        })}
                        inputRef={(el) => {
                          inputRefs.current.set(row.id, el);
                        }}
                        onChange={(e) => handleMatchChange(row.id, e.target.value)}
                        data-test-subj={`workflowSwitchCaseMatch-${index}`}
                        aria-label={i18n.translate('workflows.switchCasesField.matchAriaLabel', {
                          defaultMessage: 'Case {index} match value',
                          values: { index: index + 1 },
                        })}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={deleteCaseLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        aria-label={deleteCaseLabel}
                        onClick={() => requestDelete(row)}
                        data-test-subj={`workflowSwitchCaseDelete-${index}`}
                        css={{
                          marginTop: 4,
                          marginInlineStart: euiTheme.size.s,
                        }}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            );
          })}

          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('workflows.switchCasesField.helpText', {
                defaultMessage: 'List of match-to-steps mappings. First matching case is executed.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />

          <EuiFlexGroup justifyContent="flexStart" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="both"
                color="primary"
                iconType="plusCircle"
                onClick={handleAdd}
                data-test-subj="workflowSwitchCaseAdd"
              >
                {i18n.translate('workflows.switchCasesField.addCase', {
                  defaultMessage: 'Add case',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFormRow>

      {pendingDelete ? (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={i18n.translate('workflows.switchCasesField.deleteTitle', {
            defaultMessage: 'Delete case "{value}"?',
            values: { value: pendingLabel },
          })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => commitDelete(pendingDelete)}
          cancelButtonText={i18n.translate('workflows.switchCasesField.keepCase', {
            defaultMessage: 'Keep case',
          })}
          confirmButtonText={i18n.translate('workflows.switchCasesField.deleteCase', {
            defaultMessage: 'Delete case',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="workflowSwitchCaseDeleteConfirm"
        >
          <EuiText size="s">
            <p>
              {pendingStepCount === 1
                ? i18n.translate('workflows.switchCasesField.deleteBodySingular', {
                    defaultMessage:
                      'This case has 1 configured step underneath it on the canvas. Deleting the case will also remove that step from the workflow.',
                  })
                : i18n.translate('workflows.switchCasesField.deleteBodyPlural', {
                    defaultMessage:
                      'This case has {count} configured steps underneath it on the canvas. Deleting the case will also remove those steps from the workflow.',
                    values: { count: pendingStepCount },
                  })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
