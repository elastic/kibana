/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiHealth,
  EuiTab,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';

import { ActionCreator } from 'typescript-fsa';
import { connect } from 'react-redux';
import { FiltersGlobal } from '../../../../components/filters_global';
import { FormattedDate } from '../../../../components/formatted_date';
import { HeaderPage } from '../../../../components/header_page';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../components/search_bar';
import { WrapperPage } from '../../../../components/wrapper_page';
import { useRule } from '../../../../containers/detection_engine/rules';

import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../../../containers/source';
import { SpyRoute } from '../../../../utils/route/spy_routes';

import { SignalsHistogramPanel } from '../../components/signals_histogram_panel';
import { SignalsTable } from '../../components/signals';
import { useUserInfo } from '../../components/user_info';
import { DetectionEngineEmptyPage } from '../../detection_engine_empty_page';
import { useSignalInfo } from '../../components/signals_info';
import { StepAboutRule } from '../components/step_about_rule';
import { StepDefineRule } from '../components/step_define_rule';
import { StepScheduleRule } from '../components/step_schedule_rule';
import { buildSignalsRuleIdFilter } from '../../components/signals/default_config';
import { NoWriteSignalsCallOut } from '../../components/no_write_signals_callout';
import * as detectionI18n from '../../translations';
import { ReadOnlyCallOut } from '../components/read_only_callout';
import { RuleSwitch } from '../components/rule_switch';
import { StepPanel } from '../components/step_panel';
import { getStepsData } from '../helpers';
import * as ruleI18n from '../translations';
import * as i18n from './translations';
import { GlobalTime } from '../../../../containers/global_time';
import { signalsHistogramOptions } from '../../components/signals_histogram_panel/config';
import { InputsModelId } from '../../../../store/inputs/constants';
import { esFilters } from '../../../../../../../../../src/plugins/data/common/es_query';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';
import { inputsSelectors } from '../../../../store/inputs';
import { State } from '../../../../store';
import { InputsRange } from '../../../../store/inputs/model';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../../../store/inputs/actions';
import { getEmptyTagValue } from '../../../../components/empty_value';
import { RuleStatusFailedCallOut } from './status_failed_callout';
import { FailureHistory } from './failure_history';

interface ReduxProps {
  filters: esFilters.Filter[];
  query: Query;
}

export interface DispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

const ruleDetailTabs = [
  {
    id: 'signal',
    name: detectionI18n.SIGNAL,
    disabled: false,
  },
  {
    id: 'failure',
    name: i18n.FAILURE_HISTORY_TAB,
    disabled: false,
  },
];

type RuleDetailsComponentProps = ReduxProps & DispatchProps;

const RuleDetailsComponent = memo<RuleDetailsComponentProps>(
  ({ filters, query, setAbsoluteRangeDatePicker }) => {
    const {
      loading,
      isSignalIndexExists,
      isAuthenticated,
      canUserCRUD,
      hasManageApiKey,
      hasIndexWrite,
      signalIndexName,
    } = useUserInfo();
    const { ruleId } = useParams();
    const [isLoading, rule] = useRule(ruleId);
    const [ruleDetailTab, setRuleDetailTab] = useState('signal');
    const { aboutRuleData, defineRuleData, scheduleRuleData } = getStepsData({
      rule,
      detailsView: true,
    });
    const [lastSignals] = useSignalInfo({ ruleId });
    const userHasNoPermissions =
      canUserCRUD != null && hasManageApiKey != null ? !canUserCRUD || !hasManageApiKey : false;

    if (
      isSignalIndexExists != null &&
      isAuthenticated != null &&
      (!isSignalIndexExists || !isAuthenticated)
    ) {
      return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}`} />;
    }

    const title = isLoading === true || rule === null ? <EuiLoadingSpinner size="m" /> : rule.name;
    const subTitle = useMemo(
      () =>
        isLoading === true || rule === null ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          [
            <FormattedMessage
              id="xpack.siem.detectionEngine.ruleDetails.ruleCreationDescription"
              defaultMessage="Created by: {by} on {date}"
              values={{
                by: rule?.created_by ?? i18n.UNKNOWN,
                date: (
                  <FormattedDate
                    value={rule?.created_at ?? new Date().toISOString()}
                    fieldName="createdAt"
                  />
                ),
              }}
            />,
            rule?.updated_by != null ? (
              <FormattedMessage
                id="xpack.siem.detectionEngine.ruleDetails.ruleUpdateDescription"
                defaultMessage="Updated by: {by} on {date}"
                values={{
                  by: rule?.updated_by ?? i18n.UNKNOWN,
                  date: (
                    <FormattedDate
                      value={rule?.updated_at ?? new Date().toISOString()}
                      fieldName="updatedAt"
                    />
                  ),
                }}
              />
            ) : (
              ''
            ),
          ]
        ),
      [isLoading, rule]
    );

    const signalDefaultFilters = useMemo(
      () => (ruleId != null ? buildSignalsRuleIdFilter(ruleId) : []),
      [ruleId]
    );

    const signalMergedFilters = useMemo(() => [...signalDefaultFilters, ...filters], [
      signalDefaultFilters,
      filters,
    ]);

    const statusColor =
      rule?.status == null
        ? 'subdued'
        : rule?.status === 'succeeded'
        ? 'success'
        : rule?.status === 'failed'
        ? 'danger'
        : rule?.status === 'executing'
        ? 'warning'
        : 'subdued';

    const tabs = useMemo(
      () =>
        ruleDetailTabs.map(tab => (
          <EuiTab
            onClick={() => setRuleDetailTab(tab.id)}
            isSelected={tab.id === ruleDetailTab}
            disabled={tab.disabled}
            key={tab.name}
          >
            {tab.name}
          </EuiTab>
        )),
      [ruleDetailTabs, ruleDetailTab, setRuleDetailTab]
    );
    const ruleError = useMemo(
      () =>
        rule?.status === 'failed' && ruleDetailTab === 'signal' && rule?.last_failure_at != null ? (
          <RuleStatusFailedCallOut
            message={rule?.last_failure_message ?? ''}
            date={rule?.last_failure_at}
          />
        ) : null,
      [rule, ruleDetailTab]
    );

    const updateDateRangeCallback = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <>
        {hasIndexWrite != null && !hasIndexWrite && <NoWriteSignalsCallOut />}
        {userHasNoPermissions && <ReadOnlyCallOut />}
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <GlobalTime>
                {({ to, from }) => (
                  <StickyContainer>
                    <FiltersGlobal>
                      <SiemSearchBar id="global" indexPattern={indexPattern} />
                    </FiltersGlobal>

                    <WrapperPage>
                      <HeaderPage
                        backOptions={{
                          href: `#${DETECTION_ENGINE_PAGE_NAME}/rules`,
                          text: i18n.BACK_TO_RULES,
                        }}
                        badgeOptions={{ text: i18n.EXPERIMENTAL }}
                        border
                        subtitle={subTitle}
                        subtitle2={[
                          ...(lastSignals != null
                            ? [
                                <>
                                  {detectionI18n.LAST_SIGNAL}
                                  {': '}
                                  {lastSignals}
                                </>,
                              ]
                            : []),
                          <EuiFlexGroup
                            gutterSize="xs"
                            alignItems="center"
                            justifyContent="flexStart"
                          >
                            <EuiFlexItem grow={false}>
                              {i18n.STATUS}
                              {':'}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiHealth color={statusColor}>
                                {rule?.status ?? getEmptyTagValue()}
                              </EuiHealth>
                            </EuiFlexItem>
                            {rule?.status_date && (
                              <>
                                <EuiFlexItem grow={false}>
                                  <>{i18n.STATUS_AT}</>
                                </EuiFlexItem>
                                <EuiFlexItem grow={true}>
                                  <FormattedDate
                                    value={rule?.status_date}
                                    fieldName={i18n.STATUS_DATE}
                                  />
                                </EuiFlexItem>
                              </>
                            )}
                          </EuiFlexGroup>,
                        ]}
                        title={title}
                      >
                        <EuiFlexGroup alignItems="center">
                          <EuiFlexItem grow={false}>
                            <RuleSwitch
                              id={rule?.id ?? '-1'}
                              isDisabled={userHasNoPermissions}
                              enabled={rule?.enabled ?? false}
                              optionLabel={i18n.ACTIVATE_RULE}
                            />
                          </EuiFlexItem>

                          <EuiFlexItem grow={false}>
                            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                              <EuiFlexItem grow={false}>
                                <EuiButton
                                  href={`#${DETECTION_ENGINE_PAGE_NAME}/rules/id/${ruleId}/edit`}
                                  iconType="visControls"
                                  isDisabled={(userHasNoPermissions || rule?.immutable) ?? true}
                                >
                                  {ruleI18n.EDIT_RULE_SETTINGS}
                                </EuiButton>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </HeaderPage>
                      {ruleError}
                      {tabs}
                      <EuiSpacer />
                      {ruleDetailTab === 'signal' && (
                        <>
                          <EuiFlexGroup>
                            <EuiFlexItem component="section" grow={1}>
                              <StepPanel loading={isLoading} title={ruleI18n.DEFINITION}>
                                {defineRuleData != null && (
                                  <StepDefineRule
                                    descriptionDirection="column"
                                    isReadOnlyView={true}
                                    isLoading={false}
                                    defaultValues={defineRuleData}
                                  />
                                )}
                              </StepPanel>
                            </EuiFlexItem>

                            <EuiFlexItem component="section" grow={2}>
                              <StepPanel loading={isLoading} title={ruleI18n.ABOUT}>
                                {aboutRuleData != null && (
                                  <StepAboutRule
                                    descriptionDirection="row"
                                    isReadOnlyView={true}
                                    isLoading={false}
                                    defaultValues={aboutRuleData}
                                  />
                                )}
                              </StepPanel>
                            </EuiFlexItem>

                            <EuiFlexItem component="section" grow={1}>
                              <StepPanel loading={isLoading} title={ruleI18n.SCHEDULE}>
                                {scheduleRuleData != null && (
                                  <StepScheduleRule
                                    descriptionDirection="column"
                                    isReadOnlyView={true}
                                    isLoading={false}
                                    defaultValues={scheduleRuleData}
                                  />
                                )}
                              </StepPanel>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer />
                          <SignalsHistogramPanel
                            filters={signalMergedFilters}
                            query={query}
                            from={from}
                            stackByOptions={signalsHistogramOptions}
                            to={to}
                            updateDateRange={updateDateRangeCallback}
                          />
                          <EuiSpacer />
                          {ruleId != null && (
                            <SignalsTable
                              canUserCRUD={canUserCRUD ?? false}
                              defaultFilters={signalDefaultFilters}
                              hasIndexWrite={hasIndexWrite ?? false}
                              from={from}
                              loading={loading}
                              signalsIndex={signalIndexName ?? ''}
                              to={to}
                            />
                          )}
                        </>
                      )}
                      {ruleDetailTab === 'failure' && <FailureHistory id={rule?.id} />}
                    </WrapperPage>
                  </StickyContainer>
                )}
              </GlobalTime>
            ) : (
              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />

                <DetectionEngineEmptyPage />
              </WrapperPage>
            );
          }}
        </WithSource>

        <SpyRoute />
      </>
    );
  }
);

RuleDetailsComponent.displayName = 'RuleDetailsComponent';

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      query,
      filters,
    };
  };
};

export const RuleDetails = connect(makeMapStateToProps, {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
})(RuleDetailsComponent);

RuleDetails.displayName = 'RuleDetails';
