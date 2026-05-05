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
}));

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

export const CreateMaintenanceWindowForm = (props: CreateMaintenanceWindowFormProps) => {
  const { onCancel, onSuccess, initialValue, maintenanceWindowId } = props;

  const [defaultStartDateValue] = useState<string>(() => moment().toISOString());
  const [defaultEndDateValue] = useState<string>(() => moment().add(30, 'minutes').toISOString());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaveWithoutFiltersModalVisible, setIsSaveWithoutFiltersModalVisible] = useState(false);
  const userConfirmedSaveWithoutFiltersRef = useRef(false);
  const { defaultTimezone } = useDefaultTimezone();

  const [isScopedQueryEnabled, setIsScopedQueryEnabled] = useState(!!initialValue?.scopedQuery);
  const [query, setQuery] = useState<string>(initialValue?.scopedQuery?.kql || '');
  const [filters, setFilters] = useState<Filter[]>(
    (initialValue?.scopedQuery?.filters as Filter[]) || []
  );
  const [scopedQueryErrors, setScopedQueryErrors] = useState<string[]>([]);

  const [isAlertingV2QueryEnabled, setIsAlertingV2QueryEnabled] = useState(
    !!initialValue?.scopeAlertingV2
  );
  const [alertingV2Query, setAlertingV2Query] = useState<string>(
    initialValue?.scopeAlertingV2?.kql || ''
  );
  const [alertingV2QueryErrors, setAlertingV2QueryErrors] = useState<string[]>([]);

  const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;

  const onCreateOrUpdateError = (error: IHttpFetchError<KibanaServerError>) => {
    if (!error.body?.message) {
      return;
    }
    if (isScopedQueryError(error.body.message)) {
      setScopedQueryErrors([i18n.CREATE_FORM_SCOPED_QUERY_INVALID_ERROR_MESSAGE]);
    }
  };

  const { mutate: createMaintenanceWindow, isLoading: isCreateLoading } =
    useCreateMaintenanceWindow({
      onError: onCreateOrUpdateError,
    });

  const { mutate: updateMaintenanceWindow, isLoading: isUpdateLoading } =
    useUpdateMaintenanceWindow({
      onError: onCreateOrUpdateError,
    });

  const { mutate: archiveMaintenanceWindow } = useArchiveMaintenanceWindow();

  const { data: ruleTypes, isLoading: isLoadingRuleTypes } = useGetRuleTypes();

  const scopedQueryPayload = useMemo(() => {
    if (!isScopedQueryEnabled) {
      return null;
    }
    if (!query && !filters.length) {
      return null;
    }

    return {
      kql: query,
      filters: transformQueryFilters(filters),
    };
  }, [isScopedQueryEnabled, query, filters]);

  const scopeAlertingV2Payload = useMemo(() => {
    if (!isAlertingV2QueryEnabled) {
      return null;
    }
    if (!alertingV2Query) {
      return null;
    }

    return {
      kql: alertingV2Query,
    };
  }, [isAlertingV2QueryEnabled, alertingV2Query]);

  const submitMaintenanceWindow: FormSubmitHandler<FormProps> = async (formData, isValid) => {
    if (!isValid || scopedQueryErrors.length !== 0 || alertingV2QueryErrors.length !== 0) {
      return;
    }

    if (isScopedQueryEnabled && !scopedQueryPayload) {
      setScopedQueryErrors([i18n.CREATE_FORM_SCOPED_QUERY_EMPTY_ERROR_MESSAGE]);
      return;
    }

    if (isAlertingV2QueryEnabled && !scopeAlertingV2Payload) {
      setAlertingV2QueryErrors([i18n.CREATE_FORM_ALERTING_V2_QUERY_EMPTY_ERROR_MESSAGE]);
      return;
    }

    const startDate = moment(formData.startDate);
    const endDate = moment(formData.endDate);
    const maintenanceWindow = {
      title: formData.title,
      duration: endDate.diff(startDate),
      rRule: convertToRRule({
        startDate: startDate.toISOString(),
        timezone: formData.timezone ? formData.timezone[0] : defaultTimezone,
        recurringSchedule: formData.recurringSchedule,
      }),
      scopedQuery: scopedQueryPayload,
      scopeAlertingV2: scopeAlertingV2Payload,
      ...(scopedQueryPayload ? { categoryIds: null } : {}),
    };

    if (!scopedQueryPayload && !scopeAlertingV2Payload) {
      if (userConfirmedSaveWithoutFiltersRef.current) {
        userConfirmedSaveWithoutFiltersRef.current = false;
      } else {
        setIsSaveWithoutFiltersModalVisible(true);
        return;
      }
    }

    if (isEditMode) {
      updateMaintenanceWindow(
        { maintenanceWindowId, updateParams: maintenanceWindow },
        { onSuccess }
      );
    } else {
      createMaintenanceWindow(maintenanceWindow, { onSuccess });
    }
  };

  const { form } = useForm<FormProps>({
    defaultValue: initialValue,
    options: { stripEmptyFields: true },
    schema,
    onSubmit: submitMaintenanceWindow,
  });

  const [{ recurring, timezone, startDate, endDate }, _, mounted] = useFormData<FormProps>({
    form,
    watch: ['recurring', 'timezone', 'startDate', 'endDate'],
  });

  const isRecurring = recurring || false;

  const ruleTypeIds = useMemo(() => {
    if (!Array.isArray(ruleTypes) || !mounted) {
      return [];
    }

    return ruleTypes.map((ruleType) => ruleType.id);
  }, [ruleTypes, mounted]);

  const onScopeQueryToggle = (isEnabled: boolean) => {
    setIsScopedQueryEnabled(isEnabled);
    setScopedQueryErrors((prev) => (prev.length ? [] : prev));
  };

  const onAlertingV2QueryToggle = (isEnabled: boolean) => {
    setIsAlertingV2QueryEnabled(isEnabled);
    setAlertingV2QueryErrors((prev) => (prev.length ? [] : prev));
  };

  const onQueryChange = useCallback((newQuery: string) => {
    setScopedQueryErrors((prev) => (prev.length ? [] : prev));
    setQuery(newQuery);
  }, []);

  const onAlertingV2QueryChange = (newQuery: string) => {
    setAlertingV2QueryErrors((prev) => (prev.length ? [] : prev));
    setAlertingV2Query(newQuery);
  };

  const modalTitleId = useGeneratedHtmlId();
  const saveWithoutFiltersModalTitleId = useGeneratedHtmlId();

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
            switchChecked={isScopedQueryEnabled}
            onSwitchChange={onScopeQueryToggle}
            switchDataTestSubj="maintenanceWindowScopedQuerySwitch"
            expandedSubtitle={i18n.FILTER_ALERTS_SUBTITLE}
          >
            <UseField path="scopedQuery">
              {() => (
                <MaintenanceWindowScopedQuery
                  ruleTypeIds={ruleTypeIds}
                  query={query}
                  filters={filters}
                  isLoading={isLoadingRuleTypes}
                  isEnabled={isScopedQueryEnabled}
                  errors={scopedQueryErrors}
                  onQueryChange={onQueryChange}
                  onFiltersChange={setFilters}
                />
              )}
            </UseField>
          </ScopeSection>
          <ScopeSection
            title={i18n.ALERTING_V2_SCOPE_TITLE}
            description={i18n.ALERTING_V2_SCOPE_DESCRIPTION}
            switchLabel={i18n.ALERTING_V2_SCOPE_TITLE}
            switchChecked={isAlertingV2QueryEnabled}
            onSwitchChange={onAlertingV2QueryToggle}
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
            <UseField path="scopeAlertingV2">
              {() => (
                <EuiFormRow
                  fullWidth
                  isInvalid={alertingV2QueryErrors.length !== 0}
                  error={alertingV2QueryErrors[0]}
                >
                  <EpisodeMatcherInput
                    value={alertingV2Query}
                    onChange={onAlertingV2QueryChange}
                    fullWidth
                    data-test-subj="maintenanceWindowAlertingV2FilterInput"
                    placeholder={i18n.CREATE_FORM_ALERTINGV2_FILTERS_PLACEHOLDER}
                  />
                </EuiFormRow>
              )}
            </UseField>
          </ScopeSection>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xl" />
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
        {isSaveWithoutFiltersModalVisible && (
          <EuiConfirmModal
            aria-labelledby={saveWithoutFiltersModalTitleId}
            title={i18n.SAVE_WITHOUT_FILTERS_MODAL_TITLE}
            titleProps={{ id: saveWithoutFiltersModalTitleId }}
            onCancel={() => setIsSaveWithoutFiltersModalVisible(false)}
            onConfirm={() => {
              userConfirmedSaveWithoutFiltersRef.current = true;
              setIsSaveWithoutFiltersModalVisible(false);
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
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onCancel} data-test-subj="cancelMaintenanceWindow">
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
};
