/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
import moment from 'moment';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { isScopedQueryError } from '../../common';
import { useArchiveMaintenanceWindow } from '../hooks/use_archive_maintenance_window';
import { useCreateMaintenanceWindow } from '../hooks/use_create_maintenance_window';
import { useGetRuleTypes } from '../hooks/use_get_rule_types';
import { useUpdateMaintenanceWindow } from '../hooks/use_update_maintenance_window';
import * as i18n from '../translations';
import { useUiSetting } from '../utils/kibana_react';
import { EpisodeMatcherInput } from './episode_matcher_input';
import { DatePickerRangeField } from './fields/date_picker_range_field';
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
  const userConfirmedSaveWithoutScopeRef = useRef(false);
  const { defaultTimezone } = useDefaultTimezone();

  // v1 (alerting) scope state
  const [isAlertingV1Enabled, setIsAlertingV1Enabled] = useState(
    initialValue?.scope?.alerting !== undefined
  );
  const [query, setQuery] = useState<string>(initialValue?.scope?.alerting?.kql || '');
  const [filters, setFilters] = useState<Filter[]>(
    (initialValue?.scope?.alerting?.filters as Filter[]) || []
  );
  const [alertingV1Errors, setAlertingV1Errors] = useState<string[]>([]);

  // v2 (alertingV2) scope state
  const [isAlertingV2Enabled, setIsAlertingV2Enabled] = useState(
    initialValue?.scope?.alertingV2 !== undefined
  );
  const [alertingV2Kql, setAlertingV2Kql] = useState<string>(
    initialValue?.scope?.alertingV2?.kql || ''
  );
  const [alertingV2Errors, setAlertingV2Errors] = useState<string[]>([]);

  const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;

  const onCreateOrUpdateError = useCallback(
    (error: IHttpFetchError<KibanaServerError>) => {
      if (!error.body?.message) return;
      if (isScopedQueryError(error.body.message)) {
        if (isAlertingV2Enabled && !isAlertingV1Enabled) {
          setAlertingV2Errors([i18n.CREATE_FORM_SCOPED_QUERY_INVALID_ERROR_MESSAGE]);
        } else {
          setAlertingV1Errors([i18n.CREATE_FORM_SCOPED_QUERY_INVALID_ERROR_MESSAGE]);
        }
      }
    },
    [isAlertingV2Enabled, isAlertingV1Enabled]
  );

  const { mutate: createMaintenanceWindow, isLoading: isCreateLoading } =
    useCreateMaintenanceWindow({ onError: onCreateOrUpdateError });

  const { mutate: updateMaintenanceWindow, isLoading: isUpdateLoading } =
    useUpdateMaintenanceWindow({ onError: onCreateOrUpdateError });

  const { mutate: archiveMaintenanceWindow } = useArchiveMaintenanceWindow();

  const { data: ruleTypes, isLoading: isLoadingRuleTypes } = useGetRuleTypes();

  // Derived scope payloads — computed inline (cheap derivation from local state).
  const alertingV1Payload = isAlertingV1Enabled
    ? !query && !filters.length
      ? null
      : { kql: query, filters: transformQueryFilters(filters) }
    : undefined;

  const submitMaintenanceWindow = useCallback<FormSubmitHandler<FormProps>>(
    async (formData, isValid) => {
      if (!isValid || alertingV1Errors.length !== 0 || alertingV2Errors.length !== 0) {
        return;
      }

      const hasAnyScope = isAlertingV1Enabled || isAlertingV2Enabled;
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
      const sqPayload = isAlertingV1Enabled
        ? !query && !filters.length
          ? null
          : { kql: query, filters: transformQueryFilters(filters) }
        : undefined;
      const v2Payload = isAlertingV2Enabled
        ? alertingV2Kql
          ? { kql: alertingV2Kql }
          : null
        : undefined;

      // Build scope: key absent = not selected; { enabled: true } = selected, no filter.
      const scope: Record<string, unknown> = {};
      if (isAlertingV1Enabled) {
        scope.alerting = { enabled: true, ...(sqPayload ?? {}) };
      }
      if (isAlertingV2Enabled) {
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
        // triggering the server default { alerting: null } which suppresses all v1 alerts.
        scope,
        scopedQuery: sqPayload ?? null,
        ...(showMultipleSolutionsWarning || sqPayload ? { categoryIds: null } : {}),
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
      alertingV1Errors.length,
      alertingV2Errors.length,
      isAlertingV1Enabled,
      isAlertingV2Enabled,
      query,
      filters,
      alertingV2Kql,
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

  const onScopeQueryToggle = (isEnabled: boolean) => {
    setIsAlertingV1Enabled(isEnabled);
    if (alertingV1Errors.length) setAlertingV1Errors([]);
  };

  const onAlertingV2Toggle = (isEnabled: boolean) => {
    setIsAlertingV2Enabled(isEnabled);
    if (alertingV2Errors.length) setAlertingV2Errors([]);
  };

  const onQueryChange = (newQuery: string) => {
    if (alertingV1Errors.length) setAlertingV1Errors([]);
    setQuery(newQuery);
  };

  const onAlertingV2KqlChange = (newKql: string) => {
    if (alertingV2Errors.length) setAlertingV2Errors([]);
    setAlertingV2Kql(newKql);
  };

  const modalTitleId = useGeneratedHtmlId();
  const saveWithoutScopeModalTitleId = useGeneratedHtmlId();

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
            description={i18n.ALERTS_SCOPE_DESCRIPTION}
            switchLabel={i18n.ALERTS_SCOPE_TITLE}
            switchChecked={isAlertingV1Enabled}
            onSwitchChange={onScopeQueryToggle}
            switchDataTestSubj="maintenanceWindowScopedQuerySwitch"
            expandedSubtitle={i18n.FILTER_ALERTS_SUBTITLE}
          >
            <MaintenanceWindowScopedQuery
              ruleTypeIds={ruleTypeIds}
              query={query}
              filters={filters}
              isLoading={isLoadingRuleTypes}
              isEnabled={isAlertingV1Enabled}
              errors={alertingV1Errors}
              onQueryChange={onQueryChange}
              onFiltersChange={setFilters}
            />
          </ScopeSection>
          <ScopeSection
            title={i18n.ALERTING_V2_SCOPE_TITLE}
            description={i18n.ALERTING_V2_SCOPE_DESCRIPTION}
            switchLabel={i18n.ALERTING_V2_SCOPE_TITLE}
            switchChecked={isAlertingV2Enabled}
            onSwitchChange={onAlertingV2Toggle}
            switchDataTestSubj="alertingV2ScopedQuerySwitch"
            expandedSubtitle={i18n.FILTER_ALERTING_V2_SUBTITLE}
            titleBadge={
              <EuiBetaBadge
                label={i18n.TECHNICAL_PREVIEW_LABEL}
                iconType="flask"
                tooltipContent={i18n.CREATE_FORM_ALERTINGV2_FILTERS_TECHNICAL_PREVIEW_TOOLTIP}
                size="s"
              />
            }
          >
            <EuiFormRow
              fullWidth
              isInvalid={alertingV2Errors.length !== 0}
              error={alertingV2Errors[0]}
            >
              <EpisodeMatcherInput
                value={alertingV2Kql}
                onChange={onAlertingV2KqlChange}
                fullWidth
                data-test-subj="maintenanceWindowAlertingV2FilterInput"
                placeholder={i18n.CREATE_FORM_ALERTINGV2_FILTERS_PLACEHOLDER}
              />
            </EuiFormRow>
          </ScopeSection>
        </EuiFlexGroup>
        {(isAlertingV1Enabled && !!alertingV1Payload) || showMultipleSolutionsWarning ? (
          <EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <EuiCallOut
              announceOnMount
              data-test-subj="maintenanceWindowMultipleSolutionsRemovedWarning"
              title={i18n.SOLUTION_CONFIG_REMOVAL_WARNING_TITLE}
              color="warning"
            >
              <p>{i18n.SOLUTION_CONFIG_REMOVAL_WARNING_SUBTITLE}</p>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup
        alignItems="center"
        justifyContent={isEditMode ? 'spaceBetween' : 'flexEnd'}
        gutterSize="l"
        responsive={false}
      >
        {isEditMode && (
          <EuiFlexItem grow={false}>
            <EuiButton fill color="danger" onClick={() => setIsModalVisible(true)}>
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
        {isSaveWithoutScopeModalVisible && (
          <EuiConfirmModal
            aria-labelledby={saveWithoutScopeModalTitleId}
            title={i18n.SAVE_WITHOUT_FILTERS_MODAL_TITLE}
            titleProps={{ id: saveWithoutScopeModalTitleId }}
            onCancel={() => setIsSaveWithoutScopeModalVisible(false)}
            onConfirm={() => {
              userConfirmedSaveWithoutScopeRef.current = true;
              setIsSaveWithoutScopeModalVisible(false);
              form.submit();
            }}
            cancelButtonText={i18n.CANCEL}
            confirmButtonText={i18n.SAVE_WITHOUT_FILTERS_MODAL_CONFIRM}
            data-test-subj="saveWithoutFiltersConfirmModal"
          >
            <p>{i18n.SAVE_WITHOUT_FILTERS_MODAL_SUBTITLE}</p>
          </EuiConfirmModal>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onCancel} size="s" data-test-subj="cancelMaintenanceWindow">
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
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
