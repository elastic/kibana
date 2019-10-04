/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, FormEvent, useState } from 'react';
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

type KibanaObjectUi = KibanaObject & KibanaObjectResponse;

export interface KibanaObjects {
  [objectType: string]: KibanaObjectUi[];
}

interface PageProps {
  module: Module;
  existingGroupIds: string[];
}

enum SAVE_STATE {
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

        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
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
                  {saveState === SAVE_STATE.SAVED && (
                    <EuiCallOut
                      title={
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.jobsCreatedTitle"
                          defaultMessage="Jobs created"
                        />
                      }
                      color="success"
                      iconType="checkInCircleFilled"
                    />
                  )}
                  {saveState === SAVE_STATE.FAILED && (
                    <EuiCallOut
                      title={
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.jobsCreationFailed.saveFailedAriaLabel"
                          defaultMessage="Save failed"
                        />
                      }
                      color="danger"
                      iconType="alert"
                    >
                      <EuiButton
                        color="danger"
                        aria-label={i18n.translate(
                          'xpack.ml.newJi18n(ob.simple.recognize.jobsCreationFailed.resetButtonAriaLabel',
                          { defaultMessage: 'Reset' }
                        )}
                      >
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.jobsCreationFailed.resetButtonLabel"
                          defaultMessage="Jobs creation failed"
                        />
                      </EuiButton>
                    </EuiCallOut>
                  )}
                  {saveState === SAVE_STATE.PARTIAL_FAILURE && (
                    <EuiCallOut
                      title={
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.someJobsCreationFailedTitle"
                          defaultMessage="Some jobs failed to be created"
                        />
                      }
                      color="warning"
                      iconType="alert"
                    >
                      <EuiButton
                        color="warning"
                        aria-label={i18n.translate(
                          'xpack.ml.newJi18n(ob.simple.recognize.jobsCreationFailed.resetButtonAriaLabel',
                          { defaultMessage: 'Reset' }
                        )}
                      >
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.someJobsCreationFailed.resetButtonLabel"
                          defaultMessage="Reset"
                        />
                      </EuiButton>
                      <EuiLink
                        href={resultsUrl}
                        aria-label={i18n.translate(
                          'xpack.ml.newJob.simple.recognize.viewResultsAriaLabel',
                          { defaultMessage: 'View Results' }
                        )}
                      >
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.viewResultsLinkText"
                          defaultMessage="View Results"
                        />
                      </EuiLink>
                    </EuiCallOut>
                  )}
                  <EuiSpacer size="l" />
                  <EuiButton fill type="submit" isLoading={saveState === SAVE_STATE.SAVING}>
                    <FormattedMessage
                      id="xpack.ml.newJob.simple.recognize.createJobButtonAriaLabel"
                      defaultMessage="Create Job"
                    />
                  </EuiButton>
                </EuiForm>
              </form>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiPanel>
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.ml.newJob.simple.recognize.jobsTitle"
                    defaultMessage="Jobs"
                  />
                </h4>
              </EuiTitle>

              <EuiListGroup bordered={false} flush={true}>
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
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          {Object.keys(kibanaObjects).map(objectType => (
            <EuiFlexItem key={objectType}>
              <EuiPanel>
                <EuiTitle size="s">
                  <h4>{kibanaObjectLabels[objectType]}</h4>
                </EuiTitle>
                <EuiListGroup bordered={false} flush={true}>
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
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
};
