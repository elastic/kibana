/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, FormEvent, useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiPage,
  EuiPageBody,
  EuiTitle,
  EuiPageHeaderSection,
  EuiPageHeader,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiForm,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiListGroupItem,
  EuiListGroup,
  EuiCheckbox,
  EuiAccordion,
  EuiButton,
  EuiLink,
  EuiLoadingSpinner,
  EuiIcon,
  EuiTextAlign,
} from '@elastic/eui';
// @ts-ignore
import { ml } from 'plugins/ml/services/ml_api_service';
import { merge } from 'lodash';
import { flatten } from 'lodash';
import { useKibanaContext } from '../../../contexts/kibana';
import {
  DataRecognizerConfigResponse,
  KibanaObject,
  KibanaObjectResponse,
  Module,
  ModuleJob,
} from '../../../../common/types/modules';
import { TimeRangePicker } from '../pages/components/time_range_step/time_range_picker';
import { TimeRange } from '../pages/components/time_range_step/time_range';
import { getTimeFilterRange } from '../../../components/full_time_range_selector';
import { JobGroupsInput } from '../pages/components/job_details_step/components/groups/job_groups_input';
import { mlJobService } from '../../../services/job_service';
import { CreateResultCallout } from './components/create_result_callout';

type KibanaObjectUi = KibanaObject & KibanaObjectResponse;

export interface KibanaObjects {
  [objectType: string]: KibanaObjectUi[];
}

interface PageProps {
  module: Module;
  existingGroupIds: string[];
}

export enum SAVE_STATE {
  NOT_SAVED = 'NOT_SAVED',
  SAVING = 'SAVING',
  SAVED = 'SAVED',
  FAILED = 'FAILED',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
}

export const Page: FC<PageProps> = ({ module, existingGroupIds }) => {
  const { from, to } = getTimeFilterRange();
  const kibanaObjectLabels: { [key: string]: string } = {
    dashboard: i18n.translate('xpack.ml.newJob.simple.recognize.dashboardsLabel', {
      defaultMessage: 'Dashboards',
    }),
    search: i18n.translate('xpack.ml.newJob.simple.recognize.searchesLabel', {
      defaultMessage: 'Searches',
    }),
    visualization: i18n.translate('xpack.ml.newJob.simple.recognize.visualizationsLabel', {
      defaultMessage: 'Visualizations',
    }),
  };

  // region State
  const [jobPrefix, setJobPrefix] = useState<string>('');
  const [startDatafeedAfterSave, setStartDatafeedAfterSave] = useState<boolean>(true);
  const [useFullIndexData, setUseFullIndexData] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: from,
    end: to,
  });
  const [useDedicatedIndex, setUseDedicatedIndex] = useState<boolean>(false);
  const [jobGroups, setJobGroups] = useState<string[]>([
    ...new Set(flatten(module.jobs.map(({ config: { groups = [] } }) => groups))),
  ]);
  const [jobs, setJobs] = useState<ModuleJob[]>(module.jobs);
  const [kibanaObjects, setKibanaObjects] = useState<KibanaObjects>(module.kibana as KibanaObjects);
  const [saveState, setSaveState] = useState<SAVE_STATE>(SAVE_STATE.NOT_SAVED);
  const [resultsUrl, setResultsUrl] = useState<string>('');
  // endregion

  const onJobPrefixChange = (value: string) => {
    setJobPrefix(value && value.toLowerCase());
  };

  const {
    currentSavedSearch: savedSearch,
    currentIndexPattern: indexPattern,
    combinedQuery,
  } = useKibanaContext();
  const pageTitle =
    savedSearch.id !== undefined
      ? i18n.translate('xpack.ml.newJob.simple.recognize.savedSearchPageTitle', {
          defaultMessage: 'saved search {savedSearchTitle}',
          values: { savedSearchTitle: savedSearch.title },
        })
      : i18n.translate('xpack.ml.newJob.simple.recognize.indexPatternPageTitle', {
          defaultMessage: 'index pattern {indexPatternTitle}',
          values: { indexPatternTitle: indexPattern.title },
        });
  const displayQueryWarning = savedSearch.id !== undefined;
  const tempQuery = savedSearch.id === undefined ? undefined : combinedQuery;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaveState(SAVE_STATE.SAVING);
    try {
      const response: DataRecognizerConfigResponse = await ml.setupDataRecognizerConfig({
        moduleId: module.id,
        prefix: jobPrefix,
        groups: jobGroups,
        query: tempQuery,
        indexPatternName: indexPattern.title,
        useDedicatedIndex,
        startDatafeed: startDatafeedAfterSave,
      });
      setSaveState(SAVE_STATE.SAVED);
      // eslint-disable-next-line no-console
      console.info(response);

      const { datafeeds: datafeedsResponse, jobs: jobsResponse, kibana: kibanaResponse } = response;

      setKibanaObjects(merge(kibanaObjects, kibanaResponse));

      setResultsUrl(mlJobService.createResultsUrl([], timeRange.start, timeRange.end, 'explorer'));
    } catch (ex) {
      setSaveState(SAVE_STATE.FAILED);
      // eslint-disable-next-line no-console
      console.error(ex);
    }
  };

  const isFormVisible = [SAVE_STATE.NOT_SAVED, SAVE_STATE.SAVING].includes(saveState);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h3>
                <FormattedMessage
                  id="xpack.ml.newJob.simple.recognize.newJobFromTitle"
                  defaultMessage="New job from {pageTitle}"
                  values={{ pageTitle }}
                />
              </h3>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>

        {displayQueryWarning && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ml.newJob.simple.recognize.searchWillBeOverwrittenLabel"
                  defaultMessage="Search will be overwritten"
                />
              }
              color="warning"
              iconType="alert"
            >
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.ml.newJob.simple.recognize.usingSavedSearchDescription"
                  defaultMessage="Using a saved search will mean the query used in the datafeeds will be different from the default ones we supply in the {moduleId} module."
                  values={{ moduleId: module.id }}
                />
              </EuiText>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiFlexGroup wrap={true} gutterSize="s">
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.ml.newJob.simple.recognize.jobSettingsTitle"
                    defaultMessage="Job settings"
                  />
                </h4>
              </EuiTitle>

              <EuiSpacer size="m" />

              {isFormVisible && (
                <form onSubmit={save}>
                  <EuiForm>
                    <EuiDescribedFormGroup
                      idAria="ml_aria_label_new_job_recognizer_job_prefix"
                      title={
                        <h4>
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.jobIdPrefixLabel"
                            defaultMessage="Job ID prefix"
                          />
                        </h4>
                      }
                      description={
                        <FormattedMessage
                          id="xpack.ml.tooltips.newJobRecognizerJobPrefixTooltip"
                          defaultMessage="A prefix which will be added to the beginning of each job ID."
                        />
                      }
                    >
                      <EuiFormRow
                        label={
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.jobIdPrefixLabel"
                            defaultMessage="Job ID prefix"
                          />
                        }
                        describedByIds={['ml_aria_label_new_job_recognizer_job_prefix']}
                      >
                        <EuiFieldText
                          name="jobPrefix"
                          value={jobPrefix}
                          onChange={({ target: { value } }) => onJobPrefixChange(value)}
                        />
                      </EuiFormRow>
                    </EuiDescribedFormGroup>
                    <JobGroupsInput
                      existingGroups={existingGroupIds}
                      selectedGroups={jobGroups}
                      onChange={setJobGroups}
                    />
                    <EuiSpacer size="l" />
                    <EuiFormRow>
                      <EuiCheckbox
                        id="startDataFeed"
                        label={
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.startDatafeedAfterSaveLabel"
                            defaultMessage="Start datafeed after save"
                          />
                        }
                        checked={startDatafeedAfterSave}
                        onChange={({ target: { checked } }) => {
                          setStartDatafeedAfterSave(checked);
                        }}
                      />
                    </EuiFormRow>
                    <EuiFormRow>
                      <EuiCheckbox
                        id="useFullData"
                        label={
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.useFullDataLabel"
                            defaultMessage="Use full {indexPatternTitle} data"
                            values={{ indexPatternTitle: indexPattern.title }}
                          />
                        }
                        checked={useFullIndexData}
                        onChange={({ target: { checked } }) => {
                          setUseFullIndexData(checked);
                        }}
                      />
                    </EuiFormRow>
                    {!useFullIndexData && (
                      <TimeRangePicker setTimeRange={setTimeRange} timeRange={timeRange} />
                    )}
                    <EuiSpacer size="l" />
                    <EuiAccordion
                      id="advancedOptions"
                      buttonContent={
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.advancedLabel"
                          defaultMessage="Advanced"
                        />
                      }
                      paddingSize="l"
                    >
                      <EuiFormRow>
                        <EuiCheckbox
                          id="ml_aria_label_new_job_dedicated_index"
                          label={
                            <FormattedMessage
                              id="xpack.ml.newJob.simple.recognize.useDedicatedIndexLabel"
                              defaultMessage="Use dedicated index"
                            />
                          }
                          checked={useDedicatedIndex}
                          onChange={({ target: { checked } }) => {
                            setUseDedicatedIndex(checked);
                          }}
                        />
                      </EuiFormRow>
                    </EuiAccordion>
                    <EuiSpacer size="l" />
                  </EuiForm>
                  <EuiTextAlign textAlign="right">
                    <EuiButton fill type="submit" isLoading={saveState === SAVE_STATE.SAVING}>
                      <FormattedMessage
                        id="xpack.ml.newJob.simple.recognize.createJobButtonAriaLabel"
                        defaultMessage="Create Job"
                      />
                    </EuiButton>
                  </EuiTextAlign>
                </form>
              )}
              <CreateResultCallout saveState={saveState} resultsUrl={resultsUrl} />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.ml.newJob.simple.recognize.jobsTitle"
                    defaultMessage="Jobs"
                  />
                </h4>
              </EuiTitle>

              <EuiListGroup bordered={false} flush={true} wrapText={true} maxWidth={false}>
                {jobs.map(({ id, config: { description } }) => (
                  <EuiListGroupItem
                    key={id}
                    label={
                      <EuiFlexGroup alignItems="center" gutterSize="s">
                        <EuiFlexItem>
                          {saveState === SAVE_STATE.SAVING && <EuiLoadingSpinner size="m" />}
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s" color="secondary">
                            {jobPrefix}
                            {id}
                          </EuiText>
                          <EuiText size="s" color="subdued">
                            {description}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                  />
                ))}
              </EuiListGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            {Object.keys(kibanaObjects).map((objectType, i) => (
              <Fragment key={objectType}>
                <EuiPanel>
                  <EuiTitle size="s">
                    <h4>{kibanaObjectLabels[objectType]}</h4>
                  </EuiTitle>
                  <EuiListGroup bordered={false} flush={true} wrapText={true}>
                    {Array.isArray(kibanaObjects[objectType]) &&
                      kibanaObjects[objectType].map(({ id, title, exists, success }) => (
                        <EuiListGroupItem
                          key={id}
                          label={
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem>
                                {saveState === SAVE_STATE.SAVING ? (
                                  <EuiLoadingSpinner size="m" />
                                ) : null}
                                {success !== undefined ? (
                                  <EuiIcon
                                    type={success ? 'check' : 'cross'}
                                    color={success ? 'success' : 'danger'}
                                  />
                                ) : null}
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText size="s" color="secondary">
                                  {title}
                                </EuiText>
                                {exists && (
                                  <EuiText size="xs" color="danger">
                                    <FormattedMessage
                                      id="xpack.ml.newJob.simple.recognize.alreadyExistsLabel"
                                      defaultMessage="(already exists)"
                                    />
                                  </EuiText>
                                )}
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          }
                        />
                      ))}
                  </EuiListGroup>
                </EuiPanel>
                {i < Object.keys(kibanaObjects).length - 1 && <EuiSpacer size="s" />}
              </Fragment>
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </EuiPageBody>
    </EuiPage>
  );
};
