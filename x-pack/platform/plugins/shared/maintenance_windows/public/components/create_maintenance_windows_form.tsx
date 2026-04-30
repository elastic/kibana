/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
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
import { MaintenanceWindowScopedQuerySwitch } from './maintenance_window_scoped_query_switch';
import type { FormProps } from './schema';
import { schema } from './schema';
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
  const [isSaveWithoutFiltersModalVisible, setIsSaveWithoutFiltersModalVisible] = useState(false);
  const userConfirmedSaveWithoutFiltersRef = useRef(false);
  const { defaultTimezone } = useDefaultTimezone();

  const [isScopedQueryEnabled, setIsScopedQueryEnabled] = useState(!!initialValue?.scopedQuery);
  const [query, setQuery] = useState<string>(initialValue?.scopedQuery?.kql || '');
  const [filters, setFilters] = useState<Filter[]>(
    (initialValue?.scopedQuery?.filters as Filter[]) || []
  );
  const [scopedQueryErrors, setScopedQueryErrors] = useState<string[]>([]);

  const [isEpisodeQueryEnabled, setIsEpisodeQueryEnabled] = useState(
    !!initialValue?.scopeEpisodeQuery
  );
  const [episodeQuery, setEpisodeQuery] = useState<string>(
    initialValue?.scopeEpisodeQuery?.kql || ''
  );

  const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;

  const onCreateOrUpdateError = useCallback((error: IHttpFetchError<KibanaServerError>) => {
    if (!error.body?.message) {
      return;
    }
    if (isScopedQueryError(error.body.message)) {
      setScopedQueryErrors([i18n.CREATE_FORM_SCOPED_QUERY_INVALID_ERROR_MESSAGE]);
    }
  }, []);

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

  const scopedQueryPayload = useMemo(() => {
    if (!isScopedQueryEnabled) {
      return null;
    }
    if (!query && !filters.length) {
      return null;
    }

    // Wrapping filters in query object here to avoid schema validation failure
    const transformedFilters = transformQueryFilters(filters);

    return {
      kql: query,
      filters: transformedFilters,
    };
  }, [isScopedQueryEnabled, query, filters]);

  const scopeEpisodeQueryPayload = useMemo(() => {
    if (!isEpisodeQueryEnabled) {
      return null;
    }
    if (!episodeQuery) {
      return null;
    }

    return {
      kql: episodeQuery,
      filters: [],
    };
  }, [isEpisodeQueryEnabled, episodeQuery]);

  const submitMaintenanceWindow = useCallback<FormSubmitHandler<FormProps>>(
    async (formData, isValid) => {
      if (!isValid || scopedQueryErrors.length !== 0) {
        return;
      }

      if (isScopedQueryEnabled && !scopedQueryPayload) {
        setScopedQueryErrors([i18n.CREATE_FORM_SCOPED_QUERY_EMPTY_ERROR_MESSAGE]);
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
        scopedQuery: scopedQueryPayload ?? null,
        scopeEpisodeQuery: scopeEpisodeQueryPayload ?? null,
        ...(showMultipleSolutionsWarning || scopedQueryPayload ? { categoryIds: null } : {}),
      };

      if (!scopedQueryPayload && !scopeEpisodeQueryPayload) {
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
    },
    [
      scopedQueryErrors.length,
      isScopedQueryEnabled,
      scopedQueryPayload,
      scopeEpisodeQueryPayload,
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

  const [{ recurring, timezone, startDate, endDate }, _, mounted] = useFormData<FormProps>({
    form,
    watch: ['recurring', 'timezone', 'scopedQuery', 'startDate', 'endDate'],
  });

  const isRecurring = recurring || false;

  const closeModal = useCallback(() => setIsModalVisible(false), []);
  const showModal = useCallback(() => setIsModalVisible(true), []);

  const ruleTypeIds = useMemo(() => {
    if (!Array.isArray(ruleTypes) || !mounted) {
      return [];
    }

    return ruleTypes.map((ruleType) => ruleType.id);
  }, [ruleTypes, mounted]);

  const onScopeQueryToggle = useCallback(
    (isEnabled: boolean) => {
      setIsScopedQueryEnabled(isEnabled);
      if (scopedQueryErrors.length) {
        setScopedQueryErrors([]);
      }
    },
    [setIsScopedQueryEnabled, scopedQueryErrors, setScopedQueryErrors]
  );

  const onEpisodeQueryToggle = useCallback(
    (event: EuiSwitchEvent) => {
      setIsEpisodeQueryEnabled(event.target.checked);
    },
    [setIsEpisodeQueryEnabled]
  );

  const onQueryChange = useCallback(
    (newQuery: string) => {
      if (scopedQueryErrors.length) {
        setScopedQueryErrors([]);
      }
      setQuery(newQuery);
    },
    [scopedQueryErrors]
  );

  const modalTitleId = useGeneratedHtmlId();
  const saveWithoutFiltersModalTitleId = useGeneratedHtmlId();

  const closeSaveWithoutFiltersModal = useCallback(() => {
    setIsSaveWithoutFiltersModalVisible(false);
  }, []);

  const confirmSaveWithoutFilters = useCallback(() => {
    userConfirmedSaveWithoutFiltersRef.current = true;
    setIsSaveWithoutFiltersModalVisible(false);
    form.submit();
  }, [form]);

  const modal = useMemo(() => {
    let m;
    if (isModalVisible) {
      m = (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          title={i18n.ARCHIVE_TITLE}
          titleProps={{ id: modalTitleId }}
          onCancel={closeModal}
          onConfirm={() => {
            closeModal();
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
      );
    }
    return m;
  }, [
    closeModal,
    archiveMaintenanceWindow,
    isModalVisible,
    maintenanceWindowId,
    onSuccess,
    modalTitleId,
  ]);

  const saveWithoutFiltersModal = useMemo(() => {
    if (!isSaveWithoutFiltersModalVisible) return null;
    return (
      <EuiConfirmModal
        aria-labelledby={saveWithoutFiltersModalTitleId}
        title={i18n.SAVE_WITHOUT_FILTERS_MODAL_TITLE}
        titleProps={{ id: saveWithoutFiltersModalTitleId }}
        onCancel={closeSaveWithoutFiltersModal}
        onConfirm={confirmSaveWithoutFilters}
        cancelButtonText={i18n.CANCEL}
        confirmButtonText={i18n.SAVE_WITHOUT_FILTERS_MODAL_CONFIRM}
        data-test-subj="saveWithoutFiltersConfirmModal"
      >
        <p>{i18n.SAVE_WITHOUT_FILTERS_MODAL_SUBTITLE}</p>
      </EuiConfirmModal>
    );
  }, [
    isSaveWithoutFiltersModalVisible,
    saveWithoutFiltersModalTitleId,
    closeSaveWithoutFiltersModal,
    confirmSaveWithoutFilters,
  ]);

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
        <>
          <EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <UseField path="scopedQuery">
              {() => (
                <MaintenanceWindowScopedQuerySwitch
                  checked={isScopedQueryEnabled}
                  onEnabledChange={onScopeQueryToggle}
                />
              )}
            </UseField>
          </EuiFlexItem>
          <EuiFlexItem>
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
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h4>{i18n.CREATE_FORM_ALERTINGV2_FILTERS_TITLE}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.TECHNICAL_PREVIEW_LABEL}
                  iconType="flask"
                  tooltipContent={i18n.CREATE_FORM_ALERTINGV2_FILTERS_TECHNICAL_PREVIEW_TOOLTIP}
                  size="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="s">
              <p>
                <EuiTextColor color="subdued">
                  {i18n.CREATE_FORM_ALERTINGV2_FILTERS_DESCRIPTION}
                </EuiTextColor>
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <UseField path="scopeEpisodeQuery">
              {() => (
                <>
                  <EuiSwitch
                    data-test-subj="maintenanceWindowEpisodeDataFilterSwitch"
                    label={i18n.CREATE_FORM_ALERTINGV2_FILTERS_TOGGLE_LABEL}
                    checked={isEpisodeQueryEnabled}
                    onChange={onEpisodeQueryToggle}
                  />
                  {isEpisodeQueryEnabled && (
                    <>
                      <EuiSpacer size="m" />
                      <EpisodeMatcherInput
                        value={episodeQuery}
                        onChange={setEpisodeQuery}
                        fullWidth
                        data-test-subj="maintenanceWindowEpisodeDataFilterInput"
                        placeholder={i18n.CREATE_FORM_ALERTINGV2_FILTERS_PLACEHOLDER}
                      />
                    </>
                  )}
                </>
              )}
            </UseField>
          </EuiFlexItem>
        </>
        {(isScopedQueryEnabled && scopedQueryPayload) || showMultipleSolutionsWarning ? (
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
            <EuiButton fill color="danger" onClick={showModal}>
              {i18n.ARCHIVE}
            </EuiButton>
            {modal}
          </EuiFlexItem>
        )}
        {saveWithoutFiltersModal}
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
