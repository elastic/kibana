/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { Parser, isColumn } from '@elastic/esql';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getEsqlColumns } from '@kbn/esql-utils';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiComboBox,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getRuleProjectRouting } from '../../../utils/get_rule_project_routing';
import type { ComposeDiscoverAction, ComposeDiscoverState } from '../types';
import type { FormValues } from '../../../form/types';
import { EsqlQuerySummarySection, getEsqlSummaryState } from './esql_query_summary_section';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { useComposeDiscoverTimeField } from '../use_compose_discover_time_field';
import { getTimeFieldResolutionQuery } from '../get_time_field_resolution_query';

const LabelWithInfoPopover = ({
  label,
  title,
  body,
  maxWidth = 280,
  'data-test-subj': dataTestSubj,
}: {
  label: React.ReactNode;
  title: string;
  body: React.ReactNode;
  maxWidth?: number;
  'data-test-subj'?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  return (
    <>
      {label}{' '}
      <EuiPopover
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="upCenter"
        panelPaddingSize="m"
        aria-labelledby={popoverTitleId}
        button={
          <EuiToolTip content={title} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="info"
              color="text"
              size="xs"
              aria-label={title}
              onClick={() => setIsOpen((open) => !open)}
              data-test-subj={dataTestSubj}
            />
          </EuiToolTip>
        }
      >
        <EuiPopoverTitle id={popoverTitleId} paddingSize="m">
          {title}
        </EuiPopoverTitle>
        <EuiText size="s" css={css({ maxWidth })}>
          {body}
        </EuiText>
      </EuiPopover>
    </>
  );
};

interface AlertConditionStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  isEditing: boolean;
}

export function AlertConditionStep({
  state,
  dispatch,
  services,
  isEditing,
}: AlertConditionStepProps) {
  const { setValue, watch } = useFormContext<FormValues>();
  // Rules are registered by always-mounted QueryFieldRules in ComposeDiscoverForm.
  const { errors } = useFormState<FormValues>({ name: 'query' });
  const queryError = errors.query;
  const kind = watch('kind');
  const isAlert = kind === 'alert';
  const timeField = watch('timeField') ?? '@timestamp';
  const grouping = watch('grouping');
  const groupFields = grouping?.fields ?? [];
  const query = watch('query');

  // Committed pipeline query for output-column lookup and STATS BY auto-populate.
  const committedQuery = useMemo(
    () => getTimeFieldResolutionQuery(query, state.queryCommitted),
    [query, state.queryCommitted]
  );

  const { timeFieldOptions, isTimeFieldResolved, isResolvingTimeField } =
    useComposeDiscoverTimeField();
  // Resolution reports unresolved while the date fields are still loading.
  // Showing that as a validation error flashes the time field on every remount.
  const timeFieldInvalid = !isResolvingTimeField && !isTimeFieldResolved;

  // Time field and grouping depend on a resolved query. Disable them until a
  // non-empty query is committed (no committed query, or committed-but-empty).
  const summaryState = getEsqlSummaryState(state.queryCommitted, query);
  const hasUsableQuery = summaryState !== 'before_apply' && summaryState !== 'empty';
  const queryDependentFieldsDisabled = state.childOpen || !hasUsableQuery;

  // When the current field isn't on the index (no date fields, or a stored
  // `@timestamp` that doesn't exist), show a blank selection + invalid state so
  // the user picks one, rather than fabricating `@timestamp`.
  const currentTimeFieldIsOption = timeFieldOptions.some((option) => option.value === timeField);

  /*
   * Output columns of the full pipeline -> options for the group fields selector.
   * Uses | LIMIT 0 so no data is transferred -- only the output schema is returned.
   * Works in edit mode (query seeded on mount) without requiring the sandbox to be opened.
   */
  const { data: outputColumns = [] } = useQuery({
    queryKey: ['composeDiscoverOutputColumns', committedQuery],
    queryFn: async () => {
      const cols = await getEsqlColumns({
        esqlQuery: committedQuery,
        search: services.data.search.search,
        projectRouting: getRuleProjectRouting(committedQuery, services.cps),
      });
      return cols.map((c) => c.name);
    },
    enabled: Boolean(committedQuery),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  /*
   * Auto-populate group fields from the STATS BY clause whenever the committed
   * query changes. Re-derives on every new Apply so switching indices updates
   * the group fields instead of leaving stale values from the previous query.
   * In edit mode the first non-empty query is the saved rule: seed the ref
   * during render so that query is never treated as a change. Capturing an
   * empty first paint (the flyout remounts before watch() has the query)
   * would otherwise re-seed and drop the user's group fields.
   */
  const autoPopulatedForRef = useRef<string | null>(null);
  if (isEditing && autoPopulatedForRef.current === null && committedQuery) {
    autoPopulatedForRef.current = committedQuery;
  }
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

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {isAlert ? (
            <LabelWithInfoPopover
              label={i18n.translate(
                'xpack.alertingV2.composeDiscover.alertCondition.esqlQueryTitle',
                { defaultMessage: 'ES|QL query' }
              )}
              title={i18n.translate(
                'xpack.alertingV2.composeDiscover.alertCondition.esqlQueryHelpTitle',
                { defaultMessage: 'ES|QL query' }
              )}
              maxWidth={320}
              body={
                <>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.esqlQueryHelpIntro"
                      defaultMessage="The query has two parts. The sandbox can split one pipeline into them automatically."
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.esqlQueryHelpBaseLabel"
                      defaultMessage="{label} selects the data to evaluate:"
                      values={{
                        label: (
                          <strong>
                            {i18n.translate(
                              'xpack.alertingV2.composeDiscover.alertCondition.esqlQueryHelpBaseTerm',
                              { defaultMessage: 'Base query' }
                            )}
                          </strong>
                        ),
                      }}
                    />
                  </p>
                  <EuiCodeBlock language="esql" fontSize="s" paddingSize="s">
                    {`FROM logs-*\n| STATS errors = COUNT(*) BY host.name`}
                  </EuiCodeBlock>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.esqlQueryHelpAlertLabel"
                      defaultMessage="{label} filters which of those rows are a breach:"
                      values={{
                        label: (
                          <strong>
                            {i18n.translate(
                              'xpack.alertingV2.composeDiscover.alertCondition.esqlQueryHelpAlertTerm',
                              { defaultMessage: 'Alert condition' }
                            )}
                          </strong>
                        ),
                      }}
                    />
                  </p>
                  <EuiCodeBlock language="esql" fontSize="s" paddingSize="s">
                    {'| WHERE errors > 10'}
                  </EuiCodeBlock>
                </>
              }
              data-test-subj="composeDiscoverEsqlQueryHelp"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.composeDiscover.alertCondition.esqlQueryTitle"
              defaultMessage="ES|QL query"
            />
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EsqlQuerySummarySection
        query={query}
        queryCommitted={state.queryCommitted}
        kind={kind}
        isEditorOpen={state.childOpen}
        onOpenEditor={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step, isAlert })}
      />

      {queryError?.message ? (
        <>
          <EuiSpacer size="s" />
          <EuiText
            size="s"
            color="danger"
            role="alert"
            data-test-subj="composeDiscoverQueryFieldError"
          >
            {queryError.message}
          </EuiText>
        </>
      ) : null}

      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.timeFieldLabel', {
          defaultMessage: 'Time field',
        })}
        helpText={i18n.translate(
          'xpack.alertingV2.composeDiscover.alertCondition.timeFieldHelpText',
          {
            defaultMessage: 'The timestamp used for the lookback window. Defaults to @timestamp.',
          }
        )}
        fullWidth
        isInvalid={timeFieldInvalid}
        error={
          timeFieldInvalid ? (
            <span data-test-subj="composeDiscoverTimeFieldError">
              {i18n.translate('xpack.alertingV2.composeDiscover.alertCondition.timeFieldError', {
                defaultMessage:
                  'No time field could be resolved for this query. Edit your query to target data with a date field.',
              })}
            </span>
          ) : undefined
        }
      >
        <EuiSelect
          compressed
          fullWidth
          options={timeFieldOptions}
          value={currentTimeFieldIsOption ? timeField : ''}
          hasNoInitialSelection={!currentTimeFieldIsOption}
          isInvalid={timeFieldInvalid}
          onChange={(e) => setValue('timeField', e.target.value, { shouldDirty: true })}
          disabled={queryDependentFieldsDisabled}
          data-test-subj="composeDiscoverTimeField"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <LabelWithInfoPopover
            label={i18n.translate(
              'xpack.alertingV2.composeDiscover.alertCondition.groupFieldsLabel',
              { defaultMessage: 'Group fields' }
            )}
            title={i18n.translate(
              'xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpTitle',
              { defaultMessage: 'Group fields' }
            )}
            body={
              isAlert ? (
                <>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpBodyAlertIntro"
                      defaultMessage="Track multiple subjects independently. Each unique combination of these fields gets its own alert with a separate lifecycle. One group can stay active while another recovers."
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpBodyAlertStatsBy"
                      defaultMessage="Values should match the columns from your query's {statsBy} clause."
                      values={{
                        statsBy: <EuiCode>{'STATS … BY'}</EuiCode>,
                      }}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpBodyAlertEmpty"
                      defaultMessage="Leave empty to track everything as one combined alert."
                    />
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpBodySignalIntro"
                      defaultMessage="Record matches per subject. Each unique combination of these fields is tracked independently."
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpBodySignalStatsBy"
                      defaultMessage="Values should match the columns from your query's {statsBy} clause."
                      values={{
                        statsBy: <EuiCode>{'STATS … BY'}</EuiCode>,
                      }}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.alertCondition.groupFieldsHelpBodySignalEmpty"
                      defaultMessage="Leave empty to record everything as one combined set of events."
                    />
                  </p>
                </>
              )
            }
            data-test-subj="composeDiscoverGroupFieldsHelp"
          />
        }
        fullWidth
      >
        <EuiComboBox
          compressed
          fullWidth
          isDisabled={queryDependentFieldsDisabled}
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
    </>
  );
}
