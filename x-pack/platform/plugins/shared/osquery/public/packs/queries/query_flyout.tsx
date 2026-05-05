/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiTitle,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { EuiSwitchEvent } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormProvider, useController } from 'react-hook-form';

import { DEFAULT_PLATFORM, QUERY_TIMEOUT } from '../../../common/constants';
import {
  QueryIdField,
  IntervalField,
  VersionField,
  ResultsTypeField,
  TimeoutField,
} from '../../form';
import { CodeEditorField } from '../../saved_queries/form/code_editor_field';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from './constants';
import type {
  UsePackQueryFormProps,
  PackQueryFormData,
  PackSOQueryFormData,
} from './use_pack_query_form';
import { usePackQueryForm } from './use_pack_query_form';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { ECSMappingEditorField } from './lazy_ecs_mapping_editor_field';
import { useKibana } from '../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { overflowCss } from '../utils';
import { ScheduleSection } from '../../components/schedule_section';
import type { ScheduleFormData } from '../../components/schedule_section';

interface QueryFlyoutProps {
  uniqueQueryIds: string[];
  defaultValue?: UsePackQueryFormProps['defaultValue'] | undefined;
  /**
   * Pack-level schedule used to seed per-query schedule defaults and to surface
   * the "Using pack schedule" indicator when the user hasn't overridden it.
   */
  packDefaultSchedule?: ScheduleFormData;
  onSave: (payload: PackSOQueryFormData) => void;
  onClose: () => void;
}

const OverridePackScheduleField: React.FC<{ isDisabled?: boolean }> = ({ isDisabled }) => {
  const {
    field: { value, onChange },
  } = useController<{ override_pack_schedule: boolean }, 'override_pack_schedule'>({
    name: 'override_pack_schedule',
    defaultValue: false,
  });

  const handleToggle = useCallback(
    (event: EuiSwitchEvent) => onChange(event.target.checked),
    [onChange]
  );

  return (
    <EuiSwitch
      label={i18n.translate('xpack.osquery.queryFlyoutForm.overridePackScheduleLabel', {
        defaultMessage: 'Override pack schedule for this query',
      })}
      checked={value}
      onChange={handleToggle}
      disabled={isDisabled}
      data-test-subj="osquery-query-override-pack-schedule"
    />
  );
};

const QueryFlyoutComponent: React.FC<QueryFlyoutProps> = ({
  uniqueQueryIds,
  defaultValue,
  packDefaultSchedule,
  onSave,
  onClose,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const isRRuleSchedulingEnabled = useIsExperimentalFeatureEnabled('rruleScheduling');
  const [isEditMode] = useState(!!defaultValue);
  const { serializer, idSet, ...hooksForm } = usePackQueryForm({
    uniqueQueryIds,
    defaultValue,
    packDefaultSchedule,
  });

  const overridePackSchedule = hooksForm.watch('override_pack_schedule');

  const {
    handleSubmit,
    formState: { isSubmitting },
    resetField,
  } = hooksForm;
  const onSubmit = async (payload: PackQueryFormData) => {
    const serializedData: PackSOQueryFormData = serializer(payload);
    await onSave(serializedData);
    onClose();
  };

  const handleSetQueryValue = useCallback(
    (savedQuery: any) => {
      if (savedQuery) {
        resetField('id', { defaultValue: savedQuery.id });
        resetField('query', { defaultValue: savedQuery.query });
        resetField('platform', {
          defaultValue: savedQuery.platform ? savedQuery.platform : DEFAULT_PLATFORM,
        });
        resetField('version', { defaultValue: savedQuery.version ? [savedQuery.version] : [] });
        resetField('interval', { defaultValue: savedQuery.interval ? savedQuery.interval : 3600 });
        resetField('timeout', {
          defaultValue: savedQuery.timeout ? savedQuery.timeout : QUERY_TIMEOUT.DEFAULT,
        });
        resetField('snapshot', { defaultValue: savedQuery.snapshot ?? true });
        resetField('removed', { defaultValue: savedQuery.removed });
        resetField('ecs_mapping', { defaultValue: savedQuery.ecs_mapping ?? {} });
        // Saved queries don't carry RRULE config, so picking one always resets
        // the per-query override back to the inherited pack schedule.
        resetField('override_pack_schedule', { defaultValue: false });
      }
    },
    [resetField]
  );

  return (
    <EuiFlyout
      size="m"
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      ownFocus={true}
      outsideClickCloses={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutTitle">
            {isEditMode ? (
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.editFormTitle"
                defaultMessage="Edit query"
              />
            ) : (
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.addFormTitle"
                defaultMessage="Attach next query"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormProvider {...hooksForm}>
          {!isEditMode && permissions.readSavedQueries ? (
            <>
              <SavedQueriesDropdown onChange={handleSetQueryValue} />
              <EuiSpacer />
            </>
          ) : null}
          <QueryIdField idSet={idSet} />
          <EuiSpacer />
          <CodeEditorField />
          <EuiSpacer />
          {isRRuleSchedulingEnabled && (
            <>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.osquery.queryFlyoutForm.scheduleSectionTitle"
                    defaultMessage="Schedule"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {packDefaultSchedule && !overridePackSchedule && (
                <>
                  <EuiCallOut
                    size="s"
                    iconType="iInCircle"
                    title={i18n.translate('xpack.osquery.queryFlyoutForm.usingPackScheduleTitle', {
                      defaultMessage: 'Using pack schedule',
                    })}
                  >
                    <EuiText size="xs">
                      <FormattedMessage
                        id="xpack.osquery.queryFlyoutForm.usingPackScheduleDescription"
                        defaultMessage="This query inherits the pack-level schedule. Toggle the override below to set a different schedule for this query."
                      />
                    </EuiText>
                  </EuiCallOut>
                  <EuiSpacer size="s" />
                </>
              )}
              <OverridePackScheduleField />
              {overridePackSchedule && (
                <>
                  <EuiSpacer size="m" />
                  <ScheduleSection lockedScheduleType={packDefaultSchedule?.schedule_type} />
                </>
              )}
              <EuiSpacer />
            </>
          )}
          <EuiFlexGroup>
            <EuiFlexItem>
              {!isRRuleSchedulingEnabled && (
                <>
                  <IntervalField
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    euiFieldProps={{ append: 's' }}
                  />
                  <EuiSpacer />
                </>
              )}
              <VersionField
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  noSuggestions: false,
                  singleSelection: { asPlainText: true },
                  placeholder: i18n.translate('xpack.osquery.queriesTable.osqueryVersionAllLabel', {
                    defaultMessage: 'ALL',
                  }),
                  options: ALL_OSQUERY_VERSIONS_OPTIONS,
                  onCreateOption: undefined,
                }}
              />
              <EuiSpacer />
              <ResultsTypeField />
            </EuiFlexItem>
            <EuiFlexGroup direction={'column'} justifyContent={'spaceBetween'}>
              <EuiFlexItem>
                <PlatformCheckBoxGroupField />
              </EuiFlexItem>
              <EuiFlexItem grow={0}>
                <TimeoutField />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem css={overflowCss}>
              <ECSMappingEditorField />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FormProvider>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="query-flyout-cancel-button"
              iconType="cross"
              onClick={onClose}
              flush="left"
            >
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="query-flyout-save-button"
              isLoading={isSubmitting}
              onClick={handleSubmit(onSubmit)}
              fill
            >
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const QueryFlyout = React.memo(QueryFlyoutComponent);
