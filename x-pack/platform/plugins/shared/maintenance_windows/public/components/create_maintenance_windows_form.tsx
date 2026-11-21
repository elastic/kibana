/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { TIMEZONE_OPTIONS as UI_TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import type { Filter } from '@kbn/es-query';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { FormSubmitHandler } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FIELD_TYPES,
  Form,
  getUseField,
  useForm,
  useFormData,
  UseMultiFields,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/public';
import { RecurringScheduleFormFields } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields';
import { convertToRRule } from '@kbn/response-ops-recurring-schedule-form/utils/convert_to_rrule';
import { KbnWarningCallout } from '@kbn/ui-callout';
import moment from 'moment';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { isScopedQueryErrorAttributes } from '../../common';
import type { StopNotificationsModalCopy } from '../helpers/get_stop_notifications_modal_copy';
import {
  getScopeFilterState,
  getStopNotificationsModalCopy,
} from '../helpers/get_stop_notifications_modal_copy';
import { useArchiveMaintenanceWindow } from '../hooks/use_archive_maintenance_window';
import { useCreateMaintenanceWindow } from '../hooks/use_create_maintenance_window';
import { useGetRuleTypes } from '../hooks/use_get_rule_types';
import { useUpdateMaintenanceWindow } from '../hooks/use_update_maintenance_window';
import * as i18n from '../translations';
import { useKibana, useUiSetting } from '../utils/kibana_react';
import { EpisodeMatcherInput } from './episode_matcher_input';
import { DatePickerRangeField } from './fields/date_picker_range_field';
import { FilterHelpText } from './filter_help_text';
import { useMaintenanceWindowScope } from './hooks/use_maintenance_window_scope';
import { MaintenanceWindowScopedQuery } from './maintenance_window_scoped_query';
import type { FormProps } from './schema';
import { schema } from './schema';
import { ScopeSection } from './scope_section';
import { SubmitButton } from './submit_button';

const UseField = getUseField({ component: Field });

export interface CreateMaintenanceWindowFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialValue?: FormProps;
  maintenanceWindowId?: string;
  showMultipleSolutionsWarning?: boolean;
}

const useDefaultTimezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') {
    return { defaultTimezone: moment.tz?.guess() ?? 'UTC' };
  }
  return { defaultTimezone: kibanaTz };
};

const TIMEZONE_OPTIONS = UI_TIMEZONE_OPTIONS.map((timezoneOption) => ({
  label: timezoneOption,
})) ?? [{ label: 'UTC' }];

// The server sends the full parser message: the error, the query, and a caret line. Only the
// first line reads well under a form field.
const getFilterErrorDetail = (message?: string): string | undefined =>
  message?.split('\n')[0]?.trim() || undefined;

const transformQueryFilters = (filtersToTransform: Filter[]): Filter[] => {
  return filtersToTransform.map((filter) => {
    const { $state, meta, ...rest } = filter;
    return {
      $state,
      meta,
      query: filter?.query ? { ...filter.query } : { ...rest },
    };
  });
};

export const CreateMaintenanceWindowForm = React.memo<CreateMaintenanceWindowFormProps>((props) => {
  const {
    onCancel,
    onSuccess,
    initialValue,
    maintenanceWindowId,
    showMultipleSolutionsWarning = false,
  } = props;

  const [defaultStartDateValue] = useState<string>(moment().toISOString());
  const [defaultEndDateValue] = useState<string>(moment().add(30, 'minutes').toISOString());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaveWithoutScopeModalVisible, setIsSaveWithoutScopeModalVisible] = useState(false);
  const [stopNotificationsModal, setStopNotificationsModal] =
    useState<StopNotificationsModalCopy | null>(null);
  const userConfirmedSaveWithoutScopeRef = useRef(false);
  const userConfirmedApplyToAllAlertsRef = useRef(false);
  const { defaultTimezone } = useDefaultTimezone();
  const { services } = useKibana();
  const isUniversalAlertingEnabled = isAlertingV2Enabled(services);

  const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;

  // Create mode preselects the Alerts scope with no filter so an untouched form matches the
  // API default (`scope ?? { alerting: { enabled: true } }`) and the MV5 saved-object backfill.
  // Edit mode reads from `initialValue` as before. `null` = selected with no filter (hook contract).
  const alertingV1 = useMaintenanceWindowScope(isEditMode ? initialValue?.scope?.alerting : null);
  const alertingV2 = useMaintenanceWindowScope(
    isUniversalAlertingEnabled ? initialValue?.scope?.alertingV2 : undefined
  );

  // Destructure stable setter references so the callback doesn't rebuild on every keystroke.
  const { setErrors: setAlertingV1Errors } = alertingV1;
  const { setErrors: setAlertingV2Errors } = alertingV2;

  const onCreateOrUpdateError = useCallback(
    (error: IHttpFetchError<KibanaServerError>) => {
      const { attributes } = error.body ?? {};

      if (isScopedQueryErrorAttributes(attributes)) {
        for (const { scope, message } of attributes.scopeErrors) {
          const syntaxError = i18n.getFilterSyntaxError(getFilterErrorDetail(message));
          if (scope === 'alertingV2') {
            setAlertingV2Errors([syntaxError]);
          } else {
            setAlertingV1Errors([syntaxError]);
          }
        }
      }
    },
    [setAlertingV1Errors, setAlertingV2Errors]
  );

  const { mutate: createMaintenanceWindow, isLoading: isCreateLoading } =
    useCreateMaintenanceWindow({ onError: onCreateOrUpdateError });

  const { mutate: updateMaintenanceWindow, isLoading: isUpdateLoading } =
    useUpdateMaintenanceWindow({ onError: onCreateOrUpdateError });

  const { mutate: archiveMaintenanceWindow } = useArchiveMaintenanceWindow();

  const { data: ruleTypes, isLoading: isLoadingRuleTypes } = useGetRuleTypes();

  // Derived scope payloads — computed inline (cheap derivation from local state).
  const alertingV1Payload = alertingV1.enabled
    ? !alertingV1.kql && !alertingV1.filters.length
      ? null
      : { kql: alertingV1.kql, filters: transformQueryFilters(alertingV1.filters) }
    : undefined;

  const submitMaintenanceWindow = useCallback<FormSubmitHandler<FormProps>>(
    async (formData, isValid) => {
      if (!isValid || alertingV1.errors.length !== 0 || alertingV2.errors.length !== 0) {
        return;
      }

      const hasAnyScope = alertingV1.enabled || alertingV2.enabled;
      if (!hasAnyScope) {
        if (userConfirmedSaveWithoutScopeRef.current) {
          userConfirmedSaveWithoutScopeRef.current = false;
        } else {
          setIsSaveWithoutScopeModalVisible(true);
          return;
        }
      }

      const startDate = moment(formData.startDate);
      const endDate = moment(formData.endDate);

      // Inline payload computation so submit always uses the latest state values.
      const v1Payload = alertingV1.enabled
        ? !alertingV1.kql && !alertingV1.filters.length
          ? null
          : { kql: alertingV1.kql, filters: transformQueryFilters(alertingV1.filters) }
        : undefined;
      const v2Payload = alertingV2.enabled
        ? alertingV2.kql
          ? { kql: alertingV2.kql }
          : null
        : undefined;

      const stopNotificationsModalCopy = getStopNotificationsModalCopy(
        getScopeFilterState(alertingV1.enabled, v1Payload),
        getScopeFilterState(alertingV2.enabled, v2Payload)
      );

      if (stopNotificationsModalCopy) {
        if (userConfirmedApplyToAllAlertsRef.current) {
          userConfirmedApplyToAllAlertsRef.current = false;
        } else {
          setStopNotificationsModal(stopNotificationsModalCopy);
          return;
        }
      }

      // Build scope: key absent = not selected; { enabled: true } = selected, no filter.
      const scope: Record<string, unknown> = {};
      if (alertingV1.enabled) {
        scope.alerting = { enabled: true, ...(v1Payload ?? {}) };
      }
      if (alertingV2.enabled) {
        scope.alertingV2 = { enabled: true, ...(v2Payload ?? {}) };
      }

      const maintenanceWindow = {
        title: formData.title,
        duration: endDate.diff(startDate),
        rRule: convertToRRule({
          startDate: startDate.toISOString(),
          timezone: formData.timezone ? formData.timezone[0] : defaultTimezone,
          recurringSchedule: formData.recurringSchedule,
        }),
        // Always send scope so an explicit "no scope" ({}) reaches the server instead of
        // falling through to the server default `scope ?? { alerting: { enabled: true } }`.
        scope,
        ...(showMultipleSolutionsWarning || v1Payload ? { categoryIds: null } : {}),
      } as Parameters<typeof createMaintenanceWindow>[0];

      if (isEditMode) {
        updateMaintenanceWindow(
          { maintenanceWindowId, updateParams: maintenanceWindow },
          { onSuccess }
        );
      } else {
        createMaintenanceWindow(maintenanceWindow, { onSuccess });
      }
    },
    [
      alertingV1,
      alertingV2,
      defaultTimezone,
      isEditMode,
      showMultipleSolutionsWarning,
      updateMaintenanceWindow,
      maintenanceWindowId,
      onSuccess,
      createMaintenanceWindow,
    ]
  );

  const { form } = useForm<FormProps>({
    defaultValue: initialValue,
    options: { stripEmptyFields: true },
    schema,
    onSubmit: submitMaintenanceWindow,
  });

  const [{ recurring, timezone, startDate, endDate }, , mounted] = useFormData<FormProps>({
    form,
    watch: ['recurring', 'timezone', 'startDate', 'endDate'],
  });

  const isRecurring = recurring || false;

  const ruleTypeIds = useMemo(() => {
    if (!Array.isArray(ruleTypes) || !mounted) return [];
    return ruleTypes.map((ruleType) => ruleType.id);
  }, [ruleTypes, mounted]);

  const modalTitleId = useGeneratedHtmlId();
  const saveWithoutScopeModalTitleId = useGeneratedHtmlId();
  const applyToAllAlertsModalTitleId = useGeneratedHtmlId();

  return (
    <Form form={form} data-test-subj="createMaintenanceWindowForm">
      <EuiFlexGroup direction="column" responsive={false}>
        <EuiFlexItem>
          <UseField
            path="title"
            componentProps={{
              'data-test-subj': 'title-field',
              euiFieldProps: {
                'data-test-subj': 'createMaintenanceWindowFormNameInput',
                autoFocus: true,
              },
            }}
          />
        </EuiFlexItem>
        <EuiSpacer size="xs" />
        <EuiFlexItem>
          <EuiText size="s">
            <h4>{i18n.CREATE_FORM_TIMEFRAME_TITLE}</h4>
            <p>
              <EuiTextColor color="subdued">{i18n.CREATE_FORM_TIMEFRAME_DESCRIPTION}</EuiTextColor>
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexEnd" responsive={false}>
            <EuiFlexItem grow={3}>
              <UseMultiFields
                fields={{
                  startDate: {
                    path: 'startDate',
                    config: {
                      label: i18n.CREATE_FORM_SCHEDULE,
                      defaultValue: defaultStartDateValue,
                      validations: [],
                    },
                  },
                  endDate: {
                    path: 'endDate',
                    config: {
                      label: '',
                      defaultValue: defaultEndDateValue,
                      validations: [],
                    },
                  },
                }}
              >
                {(fields) => (
                  <DatePickerRangeField
                    fields={fields}
                    timezone={timezone ?? [defaultTimezone]}
                    data-test-subj="date-field"
                  />
                )}
              </UseMultiFields>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <UseField
                path="timezone"
                config={{
                  type: FIELD_TYPES.COMBO_BOX,
                  validations: [],
                  defaultValue: [defaultTimezone],
                }}
                componentProps={{
                  'data-test-subj': 'timezone-field',
                  id: 'timezone',
                  euiFieldProps: {
                    fullWidth: true,
                    options: TIMEZONE_OPTIONS,
                    singleSelection: { asPlainText: true },
                    isClearable: false,
                    noSuggestions: false,
                    placeholder: '',
                    prepend: (
                      <EuiFormLabel htmlFor={'timezone'}>{i18n.CREATE_FORM_TIMEZONE}</EuiFormLabel>
                    ),
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="recurring"
            componentProps={{
              'data-test-subj': 'recurring-field',
              euiFieldProps: {
                'data-test-subj': 'createMaintenanceWindowRepeatSwitch',
              },
            }}
          />
        </EuiFlexItem>
        {isRecurring && (
          <EuiFlexItem>
            <RecurringScheduleFormFields
              startDate={startDate}
              endDate={endDate}
              timezone={timezone}
              initialRecurringSchedule={initialValue?.recurringSchedule}
              allowLastDayOfMonth
            />
          </EuiFlexItem>
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" responsive={false} gutterSize="s">
          <EuiTitle size="s">
            <h3>{i18n.SCOPE_TITLE}</h3>
          </EuiTitle>
          <EuiText size="s">
            <p>
              <EuiTextColor color="subdued">{i18n.SCOPE_DESCRIPTION}</EuiTextColor>
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <ScopeSection
            title={i18n.ALERTS_SCOPE_TITLE}
            description={i18n.SCOPE_SWITCH_DESCRIPTION}
            switchLabel={i18n.ALERTS_SCOPE_TITLE}
            switchChecked={alertingV1.enabled}
            onSwitchChange={alertingV1.onToggle}
            switchDataTestSubj="maintenanceWindowScopedQuerySwitch"
            expandedSubtitle={i18n.FILTER_ALERTS_SUBTITLE}
          >
            <MaintenanceWindowScopedQuery
              ruleTypeIds={ruleTypeIds}
              query={alertingV1.kql}
              filters={alertingV1.filters}
              isLoading={isLoadingRuleTypes}
              isEnabled={alertingV1.enabled}
              errors={alertingV1.errors}
              onQueryChange={alertingV1.onKqlChange}
              onFiltersChange={alertingV1.onFiltersChange}
              helpText={
                <FilterHelpText
                  text={i18n.CLASSIC_FILTER_HELP_TEXT}
                  linkLabel={i18n.KQL_SYNTAX_LINK}
                  href={services.docLinks.links.query.kueryQuerySyntax}
                  data-test-subj="maintenanceWindowClassicFilterHelpText"
                />
              }
            />
          </ScopeSection>
          {isUniversalAlertingEnabled && (
            <ScopeSection
              title={i18n.ALERTING_V2_SCOPE_TITLE}
              description={i18n.SCOPE_SWITCH_DESCRIPTION}
              switchLabel={i18n.ALERTING_V2_SCOPE_TITLE}
              switchChecked={alertingV2.enabled}
              onSwitchChange={alertingV2.onToggle}
              switchDataTestSubj="alertingV2ScopedQuerySwitch"
              expandedSubtitle={i18n.FILTER_ALERTING_V2_SUBTITLE}
            >
              <EuiFormRow
                fullWidth
                isInvalid={alertingV2.errors.length !== 0}
                error={alertingV2.errors[0]}
                helpText={
                  <FilterHelpText
                    text={i18n.UNIVERSAL_FILTER_HELP_TEXT}
                    linkLabel={i18n.ALERT_FIELD_REFERENCE_LINK}
                    href={services.docLinks.links.alerting.universalAlertingFieldReference}
                    data-test-subj="maintenanceWindowUniversalFilterHelpText"
                  />
                }
              >
                <EpisodeMatcherInput
                  value={alertingV2.kql}
                  onChange={alertingV2.onKqlChange}
                  fullWidth
                  data-test-subj="maintenanceWindowAlertingV2FilterInput"
                  placeholder={i18n.CREATE_FORM_ALERTINGV2_FILTERS_PLACEHOLDER}
                />
              </EuiFormRow>
            </ScopeSection>
          )}
        </EuiFlexGroup>
        {(alertingV1.enabled && !!alertingV1Payload) || showMultipleSolutionsWarning ? (
          <EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <KbnWarningCallout
              announceOnMount
              data-test-subj="maintenanceWindowMultipleSolutionsRemovedWarning"
              title={i18n.SOLUTION_CONFIG_REMOVAL_WARNING_TITLE}
              text={i18n.SOLUTION_CONFIG_REMOVAL_WARNING_SUBTITLE}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="l"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="cancelMaintenanceWindow">
            {i18n.BACK}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {isSaveWithoutScopeModalVisible && (
          <EuiConfirmModal
            aria-labelledby={saveWithoutScopeModalTitleId}
            title={i18n.SAVE_WITHOUT_SCOPES_MODAL_TITLE}
            titleProps={{ id: saveWithoutScopeModalTitleId }}
            onCancel={() => setIsSaveWithoutScopeModalVisible(false)}
            onConfirm={() => {
              userConfirmedSaveWithoutScopeRef.current = true;
              setIsSaveWithoutScopeModalVisible(false);
              form.submit();
            }}
            cancelButtonText={i18n.CANCEL}
            confirmButtonText={i18n.SAVE_WITHOUT_SCOPES_MODAL_CONFIRM}
            data-test-subj="saveWithoutScopesConfirmModal"
          >
            <p>{i18n.SAVE_WITHOUT_SCOPES_MODAL_SUBTITLE}</p>
          </EuiConfirmModal>
        )}
        {stopNotificationsModal !== null && (
          <EuiConfirmModal
            aria-labelledby={applyToAllAlertsModalTitleId}
            title={stopNotificationsModal.title}
            titleProps={{ id: applyToAllAlertsModalTitleId }}
            onCancel={() => setStopNotificationsModal(null)}
            onConfirm={() => {
              userConfirmedApplyToAllAlertsRef.current = true;
              setStopNotificationsModal(null);
              form.submit();
            }}
            cancelButtonText={i18n.CANCEL}
            confirmButtonText={i18n.STOP_ALL_NOTIFICATIONS_MODAL_CONFIRM}
            data-test-subj="applyToAllAlertsConfirmModal"
          >
            <p>{stopNotificationsModal.body}</p>
          </EuiConfirmModal>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            {isEditMode && (
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" onClick={() => setIsModalVisible(true)}>
                  {i18n.ARCHIVE}
                </EuiButton>
                {isModalVisible && (
                  <EuiConfirmModal
                    aria-labelledby={modalTitleId}
                    title={i18n.ARCHIVE_TITLE}
                    titleProps={{ id: modalTitleId }}
                    onCancel={() => setIsModalVisible(false)}
                    onConfirm={() => {
                      setIsModalVisible(false);
                      archiveMaintenanceWindow(
                        { maintenanceWindowId: maintenanceWindowId!, archive: true },
                        { onSuccess }
                      );
                    }}
                    cancelButtonText={i18n.CANCEL}
                    confirmButtonText={i18n.ARCHIVE_TITLE}
                    defaultFocusedButton="confirm"
                    buttonColor="danger"
                  >
                    <p>{i18n.ARCHIVE_CALLOUT_SUBTITLE}</p>
                  </EuiConfirmModal>
                )}
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <SubmitButton isLoading={isCreateLoading || isUpdateLoading} editMode={isEditMode} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
});

CreateMaintenanceWindowForm.displayName = 'CreateMaintenanceWindowForm';
