/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { QueryClient, QueryClientProvider, useQueryClient } from '@kbn/react-query';
import {
  RuleFormProvider,
  KindField,
  AlertConditionsFieldGroup,
  AttachmentRunbookFieldGroup,
  RuleDetailsFieldGroup,
  RuleExecutionFieldGroup,
  ShowRequestModal,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '@kbn/alerting-v2-rule-form';
import type { RuleFormServices, FormValues, BuildRequestBody } from '@kbn/alerting-v2-rule-form';
import { DataSourceSection } from '../shared/components/data_source_section';
import { StatsFieldGroup } from './components/stats_field_group';
import { EvaluationsFieldGroup } from './components/evaluations_field_group';
import { ThresholdsFieldGroup } from './components/thresholds_field_group';
import { EsqlPreviewPanel } from '../shared/components/esql_preview_panel';
import { useIndexColumns } from '../shared/hooks/use_index_columns';
import { useThresholdAlertPreview } from './hooks/use_threshold_alert_preview';
import { buildEsqlQuery } from './esql_builder';
import { Aggregation, BUILDER_TYPE, Comparator, type ThresholdRuleFormValues } from './types';
import { paths, ALERTING_V2_RULE_API_PATH } from '../../../constants';
import { ruleKeys } from '../../../hooks/query_key_factory';

const THRESHOLD_RULE_FORM_ID = 'thresholdRuleForm';

const toFormValues = (values: ThresholdRuleFormValues, esqlQuery: string): FormValues => ({
  kind: values.kind,
  metadata: {
    name: values.metadata.name,
    enabled: true,
    description: values.metadata.description ?? '',
    ...(values.metadata.tags && values.metadata.tags.length > 0
      ? { tags: values.metadata.tags }
      : {}),
  },
  timeField: values.timeField,
  schedule: values.schedule,
  evaluation: { query: { base: esqlQuery } },
  ...(values.groupBy && values.groupBy.length > 0 ? { grouping: { fields: values.groupBy } } : {}),
  recoveryPolicy: values.recoveryPolicy,
  stateTransition: values.stateTransition,
  stateTransitionAlertDelayMode: values.stateTransitionAlertDelayMode,
  stateTransitionRecoveryDelayMode: values.stateTransitionRecoveryDelayMode,
  artifacts: values.artifacts,
  origin: 'rule_builder',
  builderConfig: {
    type: BUILDER_TYPE,
    config: JSON.stringify({
      indexPattern: values.indexPattern,
      timeField: values.timeField,
      filterQuery: values.filterQuery,
      stats: values.stats,
      evaluations: values.evaluations,
      alertConditions: values.alertConditions,
      conditionOperator: values.conditionOperator,
      groupBy: values.groupBy,
    }),
  },
});

const DEFAULT_FORM_VALUES: ThresholdRuleFormValues = {
  kind: 'alert',
  metadata: {
    name: '',
    description: '',
    tags: [],
  },
  indexPattern: '',
  timeField: '@timestamp',
  stats: [
    {
      id: 'stat-initial',
      label: 'count',
      aggregation: Aggregation.COUNT,
    },
  ],
  evaluations: [],
  alertConditions: [
    {
      id: 'ac-initial',
      metric: 'count',
      comparator: Comparator.GT,
      threshold: [100],
    },
  ],
  conditionOperator: 'AND',
  groupBy: [],
  schedule: {
    every: '1m',
    lookback: '5m',
  },
  recoveryPolicy: {
    type: 'no_breach',
  },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
};

const ErrorCallOut = () => {
  const {
    formState: { errors, isSubmitted },
  } = useFormContext<ThresholdRuleFormValues>();

  if (!isSubmitted || Object.keys(errors).length === 0) {
    return null;
  }

  const errorMessages: string[] = [];

  const collectErrors = (obj: Record<string, unknown>, prefix = '') => {
    for (const [key, val] of Object.entries(obj)) {
      const path = `${prefix}${key}`;
      if (val && typeof val === 'object' && 'message' in val && typeof val.message === 'string') {
        errorMessages.push(`${path}: ${val.message}`);
      } else if (val && typeof val === 'object') {
        collectErrors(val as Record<string, unknown>, `${path}.`);
      }
    }
  };
  collectErrors(errors as Record<string, unknown>);

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.errorCallout.title', {
          defaultMessage: 'Please address the highlighted errors',
        })}
        color="danger"
        iconType="error"
        size="s"
        data-test-subj="thresholdRuleFormErrorCallout"
      >
        {errorMessages.length > 0 && (
          <EuiText size="s">
            <ul>
              {errorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </EuiText>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

interface ThresholdRuleFormContentProps {
  http: HttpStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  initialValues?: Partial<ThresholdRuleFormValues>;
  ruleId?: string;
}

export const ThresholdRuleFormContent = ({
  http,
  notifications,
  application,
  data,
  dataViews,
  lens,
  initialValues,
  ruleId,
}: ThresholdRuleFormContentProps) => {
  const isEditing = Boolean(ruleId);
  const queryClient = useQueryClient();

  const formMethods = useForm<ThresholdRuleFormValues>({
    defaultValues: {
      ...DEFAULT_FORM_VALUES,
      ...initialValues,
    },
    mode: 'onBlur',
  });

  const { handleSubmit } = formMethods;

  const navigateToRuleList = useCallback(() => {
    application.navigateToUrl(http.basePath.prepend(paths.ruleList));
  }, [application, http.basePath]);

  const onSubmit = useCallback(
    async (values: ThresholdRuleFormValues) => {
      const esqlQuery = buildEsqlQuery(values);

      if (!esqlQuery) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.emptyQueryError', {
            defaultMessage: 'Cannot create rule: the generated ES|QL query is empty.',
          })
        );
        return;
      }

      const formValues = toFormValues(values, esqlQuery);

      try {
        let ruleName = values.metadata.name;
        if (isEditing && ruleId) {
          const updatePayload = mapFormValuesToUpdateRequest(formValues);
          await http.patch(`${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`, {
            body: JSON.stringify(updatePayload),
          });
        } else {
          const createPayload = mapFormValuesToCreateRequest(formValues);
          const response = await http.post(ALERTING_V2_RULE_API_PATH, {
            body: JSON.stringify(createPayload),
          });
          const createResponse = response as { metadata?: { name?: string } };
          ruleName = createResponse?.metadata?.name ?? ruleName;
        }

        notifications.toasts.addSuccess(
          isEditing
            ? i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.updateSuccess', {
                defaultMessage: "Rule ''{ruleName}'' was updated successfully",
                values: { ruleName },
              })
            : i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.createSuccess', {
                defaultMessage: "Rule ''{ruleName}'' was created successfully",
                values: { ruleName },
              })
        );

        queryClient.invalidateQueries(ruleKeys.lists());
        if (ruleId) {
          queryClient.invalidateQueries(ruleKeys.detail(ruleId));
        }
        navigateToRuleList();
      } catch (err) {
        let message = err instanceof Error ? err.message : String(err);
        if (err && typeof err === 'object' && 'body' in err) {
          const body = (err as { body?: { message?: string } }).body;
          if (body?.message) {
            message = body.message;
          }
        }
        notifications.toasts.addDanger(
          isEditing
            ? i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.updateError', {
                defaultMessage: 'Error updating rule: {message}',
                values: { message },
              })
            : i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.createError', {
                defaultMessage: 'Error creating rule: {message}',
                values: { message },
              })
        );
      }
    },
    [http, notifications, isEditing, ruleId, queryClient, navigateToRuleList]
  );

  const submitLabel = useMemo(
    () =>
      isEditing
        ? i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.saveChanges', {
            defaultMessage: 'Save changes',
          })
        : i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.createRule', {
            defaultMessage: 'Create rule',
          }),
    [isEditing]
  );

  const previewQueryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      }),
    []
  );

  const ruleFormServices: RuleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

  return (
    <QueryClientProvider client={previewQueryClient}>
      <FormProvider {...formMethods}>
        <RuleFormProvider services={ruleFormServices}>
          <ThresholdRuleFormBody
            http={http}
            data={data}
            ruleId={ruleId}
            submitLabel={submitLabel}
            onSubmit={handleSubmit(onSubmit)}
            navigateToRuleList={navigateToRuleList}
          />
        </RuleFormProvider>
      </FormProvider>
    </QueryClientProvider>
  );
};

interface ThresholdRuleFormBodyProps {
  http: HttpStart;
  data: DataPublicPluginStart;
  ruleId?: string;
  submitLabel: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  navigateToRuleList: () => void;
}

const ThresholdRuleFormBody = ({
  http,
  data,
  ruleId,
  submitLabel,
  onSubmit,
  navigateToRuleList,
}: ThresholdRuleFormBodyProps) => {
  const { formState, getValues } = useFormContext<ThresholdRuleFormValues>();
  const [isShowRequestVisible, setIsShowRequestVisible] = useState(false);
  const { allColumns, numericColumns, isLoading: isColumnsLoading } = useIndexColumns({ data });

  const preview = useThresholdAlertPreview({ data });

  const buildRequestBody: BuildRequestBody = useCallback(
    (activeTab) => {
      const values = getValues();
      const esqlQuery = buildEsqlQuery(values) || '';
      const formValues = toFormValues(values, esqlQuery);
      const body =
        activeTab === 'update'
          ? mapFormValuesToUpdateRequest(formValues)
          : mapFormValuesToCreateRequest(formValues);
      return JSON.stringify(body, null, 2);
    },
    [getValues]
  );

  return (
    <EuiFlexGroup gutterSize="l" alignItems="flexStart">
      <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
        <EuiForm id={THRESHOLD_RULE_FORM_ID} component="form" onSubmit={onSubmit}>
          <ErrorCallOut />
          <RuleDetailsFieldGroup />
          <EuiSpacer size="m" />
          <DataSourceSection allColumns={allColumns} isColumnsLoading={isColumnsLoading} />
          <EuiSpacer size="m" />
          <StatsFieldGroup numericColumns={numericColumns} isColumnsLoading={isColumnsLoading} />
          <EuiSpacer size="m" />
          <EvaluationsFieldGroup />
          <EuiSpacer size="m" />
          <ThresholdsFieldGroup />
          <EuiSpacer size="m" />
          <RuleExecutionFieldGroup />
          <EuiSpacer size="m" />
          <KindField />
          <EuiSpacer size="m" />
          <AlertConditionsFieldGroup />
          <EuiSpacer size="m" />
          <AttachmentRunbookFieldGroup />
        </EuiForm>
        <EuiHorizontalRule />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={navigateToRuleList}
              isDisabled={formState.isSubmitting}
              data-test-subj="ruleV2FormCancelButton"
            >
              {i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => setIsShowRequestVisible(true)}
                  isDisabled={formState.isSubmitting}
                  data-test-subj="ruleV2FormShowRequestButton"
                >
                  {i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.showRequest', {
                    defaultMessage: 'Show request',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  type="submit"
                  form={THRESHOLD_RULE_FORM_ID}
                  fill
                  isLoading={formState.isSubmitting}
                  iconType="plusInCircle"
                  data-test-subj="ruleV2FormSubmitButton"
                >
                  {submitLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isShowRequestVisible && (
          <ShowRequestModal
            ruleId={ruleId}
            onClose={() => setIsShowRequestVisible(false)}
            buildRequestBody={buildRequestBody}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
        <EsqlPreviewPanel
          title={i18n.translate(
            'xpack.alertingV2.ruleBuilder.thresholdAlert.preview.resultsTitle',
            {
              defaultMessage: 'Rule results preview',
            }
          )}
          dataTestSubj="ruleV2PreviewGrid"
          emptyBody={i18n.translate(
            'xpack.alertingV2.ruleBuilder.thresholdAlert.preview.emptyBody',
            {
              defaultMessage:
                'Configure an index pattern, time field, and conditions to see a preview of matching results.',
            }
          )}
          noResultsBody={i18n.translate(
            'xpack.alertingV2.ruleBuilder.thresholdAlert.preview.noResultsBody',
            {
              defaultMessage:
                'The query returned no results for the configured lookback window. Try adjusting the conditions or lookback period.',
            }
          )}
          columns={preview.columns}
          rows={preview.rows}
          totalRowCount={preview.totalRowCount}
          isLoading={preview.isLoading}
          isError={preview.isError}
          error={preview.error}
          uniqueGroupCount={preview.uniqueGroupCount}
          hasValidQuery={preview.hasValidQuery}
          query={preview.query}
          timeField={preview.timeField}
          lookback={preview.lookback}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
