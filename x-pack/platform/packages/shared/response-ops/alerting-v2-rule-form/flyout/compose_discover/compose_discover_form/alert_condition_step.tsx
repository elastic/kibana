/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Parser, isColumn } from '@elastic/esql';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { getEsqlColumns } from '@kbn/esql-utils';
import {
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ComposeDiscoverAction, ComposeDiscoverState } from '../types';
import type { ComposeFormValues } from '../compose_form_types';
import { isQueryDefined } from '../compose_form_types';
import { EsqlQuerySummarySection } from './esql_query_summary_section';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { useDataFields } from '../../../form/hooks/use_data_fields';
import { ScheduleField } from '../../../form/fields/schedule_field';
import { LookbackWindowField } from '../../../form/fields/lookback_window_field';
import { AlertDelayField } from '../../../form/fields/alert_delay_field';
import { ModeSelect } from '../../../form/fields/mode_select';

interface AlertConditionStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  onKindChange: (kind: 'signal' | 'alert') => void;
  onSeparateBaseAndAlert?: () => void;
  isEditing: boolean;
}

export function AlertConditionStep({
  state,
  dispatch,
  services,
  onKindChange,
  onSeparateBaseAndAlert,
  isEditing,
}: AlertConditionStepProps) {
  const { setValue, watch } = useFormContext<ComposeFormValues>();
  const isAlert = watch('kind') === 'alert';
  const timeField = watch('timeField') ?? '@timestamp';
  const grouping = watch('grouping');
  const groupFields = grouping?.fields ?? [];
  const query = watch('query');

  const baseQuery = query.format === 'composed' ? query.base : '';
  const alertBlock = query.format === 'composed' ? query.breach.segment : '';
  const fullQuery = query.format === 'standalone' ? query.breach.query : '';

  // Use the base query for field lookup when tracking is on; fall back to full breach query.
  const committedQuery = useMemo(() => {
    const q = isAlert ? baseQuery : fullQuery;
    return /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(q) && state.queryCommitted ? q : '';
  }, [isAlert, baseQuery, fullQuery, state.queryCommitted]);

  const { data: fieldMap } = useDataFields({
    query: committedQuery,
    http: services.http,
    dataViews: services.dataViews,
  });
  const timeFieldOptions = useMemo(() => {
    const dateFields = Object.values(fieldMap ?? {})
      .filter((f) => f.type === 'date')
      .map((f) => f.name)
      .sort();
    if (dateFields.length === 0) {
      return [{ value: '@timestamp', text: '@timestamp' }];
    }
    return dateFields.map((name) => ({ value: name, text: name }));
  }, [fieldMap]);

  // Output columns of the full pipeline -> options for the group fields selector.
  // Uses | LIMIT 0 so no data is transferred -- only the output schema is returned.
  // Works in edit mode (query seeded on mount) without requiring the sandbox to be opened.
  const { data: outputColumns = [] } = useQuery({
    queryKey: ['composeDiscoverOutputColumns', committedQuery],
    queryFn: async () => {
      const cols = await getEsqlColumns({
        esqlQuery: committedQuery,
        search: services.data.search.search,
      });
      return cols.map((c) => c.name);
    },
    enabled: Boolean(committedQuery),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  // Auto-populate group fields from the STATS BY clause whenever the committed
  // query changes. Re-derives on every new Apply so switching indices updates
  // the group fields instead of leaving stale values from the previous query.
  // Skips the first run when editing to preserve API-seeded grouping defaults.
  const autoPopulatedForRef = useRef<string | null>(isEditing ? committedQuery : null);
  useEffect(() => {
    if (!state.queryCommitted || !committedQuery) return;
    if (autoPopulatedForRef.current === committedQuery) return;
    autoPopulatedForRef.current = committedQuery;
    try {
      const { root } = Parser.parse(committedQuery);
      const statsCmd = [...root.commands].reverse().find((c) => c.name === 'stats');
      interface CmdOption {
        type: string;
        name: string;
        args?: unknown[];
      }
      const byOption = (statsCmd?.args as CmdOption[] | undefined)?.find(
        (a) => a.type === 'option' && a.name === 'by'
      );
      const byFields = (byOption?.args ?? []).filter(isColumn).map((a) => a.name);
      setValue('grouping', byFields.length > 0 ? { fields: byFields } : undefined);
    } catch {
      // Non-parseable query -- skip auto-populate
    }
  }, [state.queryCommitted, committedQuery, setValue]);

  // Callout when Apply was used but no query content was committed.
  const queryEmpty = isAlert && state.queryCommitted && !isQueryDefined(query);

  // Callout when the heuristic split couldn't find a clear split point.
  const splitFailed =
    isAlert &&
    state.queryCommitted &&
    isQueryDefined(query) &&
    query.format === 'composed' &&
    !query.base.trim();

  // Base query without a separate alert condition (e.g. STATS with no trailing WHERE).
  const noAlertCondition =
    isAlert &&
    state.queryCommitted &&
    isQueryDefined(query) &&
    query.format === 'composed' &&
    Boolean(query.base.trim()) &&
    !query.breach.segment.trim();

  const openQueryEditor = () =>
    dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step, isAlert });

  const editQueryLabel = i18n.translate(
    'xpack.alertingV2.composeDiscover.alertCondition.editQueryButtonLabel',
    { defaultMessage: 'Edit query' }
  );

  const openEditorLabel = i18n.translate(
    'xpack.alertingV2.composeDiscover.alertCondition.openEditorButtonLabel',
    { defaultMessage: 'Open query editor' }
  );

  const notDefinedLabel = i18n.translate(
    'xpack.alertingV2.composeDiscover.alertCondition.notDefined',
    { defaultMessage: 'Not defined' }
  );

  const querySectionDescription = !state.queryCommitted
    ? i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.startQueryDescription', {
        defaultMessage: 'Open the editor to write your ES|QL query',
      })
    : queryEmpty
      ? i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.queryEmptyDescription', {
          defaultMessage: 'Define an ES|QL query in the editor',
        })
      : splitFailed
        ? i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.splitFailedDescription', {
            defaultMessage: 'Review your query or separate it manually',
          })
        : noAlertCondition
          ? i18n.translate(
              'xpack.alertingV2.composeDiscover.alertCondition.noAlertConditionDescription',
              {
                defaultMessage: 'Base query defined — no separate alert condition',
              }
            )
          : isAlert
            ? i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.baseAndAlertDetected', {
                defaultMessage: 'Search query and alert condition identified',
              })
            : i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.queryDefined', {
                defaultMessage: 'Query defined',
              });

  const queryEmptyCallout = queryEmpty ? (
    <EuiCallOut
      announceOnMount={false}
      size="s"
      color="primary"
      iconType="info"
      title={i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.queryEmptyTitle', {
        defaultMessage: 'No query defined',
      })}
    >
      {i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.queryEmptyBody', {
        defaultMessage: 'Enter an ES|QL query in the editor before continuing.',
      })}
    </EuiCallOut>
  ) : undefined;

  const splitFailedCallout = splitFailed ? (
    <EuiCallOut
      announceOnMount={false}
      size="s"
      color="primary"
      iconType="info"
      title={i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.splitFailedTitle', {
        defaultMessage: "Couldn't automatically separate base query from alert condition.",
      })}
    >
      {onSeparateBaseAndAlert && (
        <>
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            isDisabled={state.childOpen}
            onClick={onSeparateBaseAndAlert}
            data-test-subj="composeDiscoverSeparateBaseAndAlert"
          >
            {i18n.translate(
              'xpack.alertingV2.composeDiscover.alertCondition.separateBaseAndAlertButton',
              { defaultMessage: 'Separate base and alert' }
            )}
          </EuiButton>
        </>
      )}
    </EuiCallOut>
  ) : undefined;

  const noAlertConditionCallout = noAlertCondition ? (
    <EuiCallOut
      announceOnMount={false}
      size="s"
      color="primary"
      iconType="info"
      title={i18n.translate(
        'xpack.alertingV2.composeDiscover.alertCondition.noAlertConditionTitle',
        {
          defaultMessage: 'No alert condition',
        }
      )}
    >
      {i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.noAlertConditionBody', {
        defaultMessage:
          'Without an alert condition, every row returned by the base query is treated as a breach.',
      })}
    </EuiCallOut>
  ) : undefined;

  return (
    <>
      <ModeSelect
        value={isAlert ? 'alert' : 'signal'}
        onChange={onKindChange}
        disabled={!state.queryCommitted || !isQueryDefined(query) || isEditing || state.childOpen}
        compressed
        data-test-subj="composeDiscoverModeSelect"
      />
      <EuiSpacer size="m" />

      <EsqlQuerySummarySection
        description={querySectionDescription}
        callout={queryEmptyCallout ?? splitFailedCallout ?? noAlertConditionCallout}
        isEmpty={!state.queryCommitted}
        emptyAction={{
          label: openEditorLabel,
          onClick: openQueryEditor,
          testSubj: 'composeDiscoverOpenEditor',
          disabled: state.childOpen,
        }}
        blocks={
          isAlert
            ? [
                {
                  id: 'base',
                  label: i18n.translate(
                    'xpack.alertingV2.composeDiscover.alertCondition.baseQueryLabel',
                    { defaultMessage: 'Base query' }
                  ),
                  query: baseQuery,
                  emptyMessage: notDefinedLabel,
                },
                {
                  id: 'alert',
                  label: i18n.translate(
                    'xpack.alertingV2.composeDiscover.alertCondition.alertBlockLabel',
                    { defaultMessage: 'Alert condition' }
                  ),
                  query: alertBlock,
                  emptyMessage: notDefinedLabel,
                },
              ]
            : [
                {
                  id: 'query',
                  label: i18n.translate(
                    'xpack.alertingV2.composeDiscover.alertCondition.queryLabel',
                    { defaultMessage: 'Query' }
                  ),
                  query: fullQuery,
                  emptyMessage: notDefinedLabel,
                },
              ]
        }
        editButtonLabel={editQueryLabel}
        onEdit={openQueryEditor}
        editDisabled={state.childOpen}
        editTestSubj="composeDiscoverEditQuery"
      />

      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.timeFieldLabel', {
          defaultMessage: 'Time field',
        })}
        fullWidth
      >
        <EuiSelect
          fullWidth
          compressed
          options={timeFieldOptions}
          value={timeField}
          onChange={(e) => setValue('timeField', e.target.value, { shouldDirty: true })}
          disabled={state.childOpen}
          data-test-subj="composeDiscoverTimeField"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.groupFieldsLabel', {
          defaultMessage: 'Group fields',
        })}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          compressed
          options={outputColumns.map((name) => ({ label: name }))}
          selectedOptions={groupFields.map((f) => ({ label: f }))}
          onChange={(opts) =>
            setValue('grouping', opts.length ? { fields: opts.map((o) => o.label) } : undefined, {
              shouldDirty: true,
            })
          }
          onCreateOption={(val) =>
            setValue('grouping', { fields: [...groupFields, val] }, { shouldDirty: true })
          }
          placeholder={i18n.translate(
            'xpack.alertingV2.composeDiscover.alertCondition.groupFieldsPlaceholder',
            { defaultMessage: 'Add group fields' }
          )}
          data-test-subj="composeDiscoverGroupFields"
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="m" />

      {isAlert && (
        <>
          <EuiTitle size="xs" data-test-subj="composeDiscoverAlertConditionsSectionTitle">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.composeDiscover.alertCondition.alertConditionsSectionTitle"
                defaultMessage="Alert conditions"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AlertDelayField />
          <EuiHorizontalRule margin="m" />
        </>
      )}

      <EuiTitle size="xs" data-test-subj="composeDiscoverRuleExecutionSectionTitle">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.composeDiscover.alertCondition.ruleExecutionSectionTitle"
            defaultMessage="Rule execution"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ScheduleField />
      <EuiSpacer size="m" />
      <LookbackWindowField />
    </>
  );
}
