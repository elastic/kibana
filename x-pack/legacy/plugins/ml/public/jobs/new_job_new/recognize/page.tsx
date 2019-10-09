/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, FormEvent, useState, Fragment, useEffect } from 'react';
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
  EuiCheckbox,
  EuiAccordion,
  EuiButton,
  EuiTextAlign,
  EuiSwitch,
} from '@elastic/eui';
import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { merge, flatten } from 'lodash';
import { ml } from '../../../services/ml_api_service';
import { useKibanaContext } from '../../../contexts/kibana';
import {
  DatafeedResponse,
  DataRecognizerConfigResponse,
  JobResponse,
  KibanaObject,
  KibanaObjectResponse,
  Module,
  ModuleJob,
} from '../../../../common/types/modules';
import { TimeRangePicker } from '../pages/components/time_range_step/time_range_picker';
import { getTimeFilterRange } from '../../../components/full_time_range_selector';
import { JobGroupsInput } from '../pages/components/job_details_step/components/groups/job_groups_input';
import { mlJobService } from '../../../services/job_service';
import { CreateResultCallout } from './components/create_result_callout';
import { KibanaObjects } from './components/kibana_objects';
import { ModuleJobs } from './components/module_jobs';
import {
  composeValidators,
  maxLengthValidator,
  patternValidator,
} from '../../../../common/util/validators';
import { JOB_ID_MAX_LENGTH } from '../../../../common/constants/validation';
import { isJobIdValid } from '../../../../common/util/job_utils';

export interface ModuleJobUI extends ModuleJob {
  datafeedResult?: DatafeedResponse;
  setupResult?: JobResponse;
}

export type KibanaObjectUi = KibanaObject & KibanaObjectResponse;

export interface KibanaObjects {
  [objectType: string]: KibanaObjectUi[];
}

interface PageProps {
  moduleId: string;
  existingGroupIds: string[];
}

export enum SAVE_STATE {
  NOT_SAVED = 'NOT_SAVED',
  SAVING = 'SAVING',
  SAVED = 'SAVED',
  FAILED = 'FAILED',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
}

export const Page: FC<PageProps> = ({ moduleId, existingGroupIds }) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  const { from, to } = getTimeFilterRange();

  // #region State
  const [formState, setFormState] = useState({
    jobPrefix: '',
    startDatafeedAfterSave: true,
    useFullIndexData: true,
    timeRange: {
      start: from,
      end: to,
    },
    useDedicatedIndex: false,
    jobGroups: [] as string[],
  });
  const [jobs, setJobs] = useState<ModuleJobUI[]>([]);
  const [kibanaObjects, setKibanaObjects] = useState<KibanaObjects>({} as KibanaObjects);
  const [saveState, setSaveState] = useState<SAVE_STATE>(SAVE_STATE.NOT_SAVED);
  const [resultsUrl, setResultsUrl] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>({});
  // #endregion

  const onJobPrefixChange = (value: string) => {
    setFormState({
      ...formState,
      jobPrefix: value && value.toLowerCase(),
    });
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

  const loadModule = async () => {
    try {
      const response: Module = await ml.getDataRecognizerModule({ moduleId });
      setJobs(response.jobs);

      const kibanaObjectsResult = await checkForSavedObjects(response.kibana as KibanaObjects);
      setKibanaObjects(kibanaObjectsResult);

      setFormState({
        ...formState,
        jobGroups: [
          ...new Set(flatten(response.jobs.map(({ config: { groups = [] } }) => groups))),
        ],
      });
      setSaveState(SAVE_STATE.NOT_SAVED);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  /**
   * Gets kibana objects with an existence check.
   */
  const checkForSavedObjects = async (objects: KibanaObjects): Promise<KibanaObjects> => {
    try {
      return await Object.keys(objects).reduce(async (prevPromise, type) => {
        const acc = await prevPromise;
        const { savedObjects } = await savedObjectsClient.find({
          type,
          perPage: 1000,
        });

        acc[type] = objects[type].map(obj => {
          const find = savedObjects.find(savedObject => savedObject.attributes.title === obj.title);
          return {
            ...obj,
            exists: !!find,
            id: (!!find && find.id) || obj.id,
          };
        });
        return Promise.resolve(acc);
      }, Promise.resolve({} as KibanaObjects));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Could not load saved objects', e);
    }
    return Promise.resolve(objects);
  };

  const getTimeRange = async (): Promise<{ start: number; end: number }> => {
    const { useFullIndexData, timeRange } = formState;
    if (useFullIndexData) {
      const { start, end } = await ml.getTimeFieldRange({
        index: indexPattern.title,
        timeFieldName: indexPattern.timeFieldName,
        query: combinedQuery,
      });
      return {
        start: start.epoch,
        end: end.epoch,
      };
    } else {
      return Promise.resolve(timeRange);
    }
  };

  useEffect(() => {
    loadModule();
  }, []);

  const jobPrefixValidator = composeValidators(
    patternValidator(/^([a-z0-9]+[a-z0-9\-_]*)?$/),
    maxLengthValidator(JOB_ID_MAX_LENGTH - Math.max(...jobs.map(({ id }) => id.length)))
  );
  const groupValidator = composeValidators(
    (value: string) => (isJobIdValid(value) ? null : { pattern: true }),
    maxLengthValidator(JOB_ID_MAX_LENGTH)
  );

  const handleValidation = () => {
    const jobPrefixValidationResult = jobPrefixValidator(formState.jobPrefix);
    const jobGroupsValidationResult = formState.jobGroups
      .map(group => groupValidator(group))
      .filter(result => result !== null);

    setValidationResult({
      jobPrefix: jobPrefixValidationResult,
      jobGroups: jobGroupsValidationResult,
      formValid: !jobPrefixValidationResult && jobGroupsValidationResult.length === 0,
    });
  };

  useEffect(() => {
    handleValidation();
  }, [formState.jobPrefix, formState.jobGroups]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaveState(SAVE_STATE.SAVING);
    const { jobPrefix, jobGroups, startDatafeedAfterSave, useDedicatedIndex } = formState;

    const timeRange = await getTimeRange();

    try {
      const response: DataRecognizerConfigResponse = await ml.setupDataRecognizerConfig({
        moduleId,
        prefix: jobPrefix,
        groups: jobGroups,
        query: tempQuery,
        indexPatternName: indexPattern.title,
        useDedicatedIndex,
        startDatafeed: startDatafeedAfterSave,
        ...timeRange,
      });
      const { datafeeds: datafeedsResponse, jobs: jobsResponse, kibana: kibanaResponse } = response;

      setJobs(
        jobs.map(job => {
          return {
            ...job,
            datafeedResult: datafeedsResponse.find(({ id }) => id.endsWith(job.id)),
            setupResult: jobsResponse.find(({ id }) => id === jobPrefix + job.id),
          };
        })
      );
      setKibanaObjects(merge(kibanaObjects, kibanaResponse));
      setResultsUrl(
        mlJobService.createResultsUrl(
          jobsResponse.filter(({ success }) => success).map(({ id }) => id),
          timeRange.start,
          timeRange.end,
          'explorer'
        )
      );
      const failedJobsCount = jobsResponse.reduce((count, { success }) => {
        return success ? count : count + 1;
      }, 0);
      setSaveState(
        failedJobsCount === 0
          ? SAVE_STATE.SAVED
          : failedJobsCount === jobs.length
          ? SAVE_STATE.FAILED
          : SAVE_STATE.PARTIAL_FAILURE
      );
    } catch (e) {
      setSaveState(SAVE_STATE.FAILED);
      // eslint-disable-next-line no-console
      console.error('Error setting up module', e);
      toastNotifications.addDanger({
        title: i18n.translate('xpack.ml.newJob.simple.recognize.moduleSetupFailedWarningTitle', {
          defaultMessage: 'Error setting up module {moduleId}',
          values: { moduleId },
        }),
        text: i18n.translate(
          'xpack.ml.newJob.simple.recognize.moduleSetupFailedWarningDescription',
          {
            defaultMessage:
              'An error occurred trying to create the {count, plural, one {job} other {jobs}} in the module.',
            values: {
              count: jobs.length,
            },
          }
        ),
      });
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
                  values={{ moduleId }}
                />
              </EuiText>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiFlexGroup wrap={true} gutterSize="m">
          <EuiFlexItem grow={1}>
            <EuiPanel grow={false}>
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
                <>
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
                        isInvalid={!!validationResult.jobPrefix}
                        error={
                          <>
                            {validationResult.jobPrefix && validationResult.jobPrefix.maxLength ? (
                              <div>
                                <FormattedMessage
                                  id="xpack.ml.newJob.simple.recognize.jobPrefixInvalidMaxLengthErrorMessage"
                                  defaultMessage="Job ID prefix must be no more than {maxLength, plural, one {# character} other {# characters}} long."
                                  values={{
                                    maxLength: validationResult.jobPrefix.maxLength.requiredLength,
                                  }}
                                />
                              </div>
                            ) : null}
                            {validationResult.jobPrefix && validationResult.jobPrefix.pattern && (
                              <div>
                                <FormattedMessage
                                  id="xpack.ml.newJob.simple.recognize.jobLabelAllowedCharactersDescription"
                                  defaultMessage="Job label can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; must start and end with an alphanumeric character"
                                />
                              </div>
                            )}
                          </>
                        }
                      >
                        <EuiFieldText
                          name="jobPrefix"
                          value={formState.jobPrefix}
                          onChange={({ target: { value } }) => onJobPrefixChange(value)}
                          isInvalid={!!validationResult.jobPrefix}
                        />
                      </EuiFormRow>
                    </EuiDescribedFormGroup>
                    <JobGroupsInput
                      existingGroups={existingGroupIds}
                      selectedGroups={formState.jobGroups}
                      onChange={value => {
                        setFormState({
                          ...formState,
                          jobGroups: value,
                        });
                      }}
                      validation={{
                        valid:
                          !validationResult.jobGroups || validationResult.jobGroups.length === 0,
                        message: (
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.jobGroupAllowedCharactersDescription"
                            defaultMessage="Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; must start and end with an alphanumeric character"
                          />
                        ),
                      }}
                    />
                    <EuiSpacer size="l" />
                    <EuiFormRow>
                      <EuiCheckbox
                        id="startDataFeed"
                        name="startDataFeed"
                        label={
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.startDatafeedAfterSaveLabel"
                            defaultMessage="Start datafeed after save"
                          />
                        }
                        checked={formState.startDatafeedAfterSave}
                        onChange={({ target: { checked } }) => {
                          setFormState({
                            ...formState,
                            startDatafeedAfterSave: checked,
                          });
                        }}
                      />
                    </EuiFormRow>
                    <EuiFormRow>
                      <EuiCheckbox
                        id="useFullData"
                        name="useFullData"
                        label={
                          <FormattedMessage
                            id="xpack.ml.newJob.simple.recognize.useFullDataLabel"
                            defaultMessage="Use full {indexPatternTitle} data"
                            values={{ indexPatternTitle: indexPattern.title }}
                          />
                        }
                        checked={formState.useFullIndexData}
                        onChange={({ target: { checked } }) => {
                          setFormState({
                            ...formState,
                            useFullIndexData: checked,
                          });
                        }}
                      />
                    </EuiFormRow>
                    {!formState.useFullIndexData && (
                      <TimeRangePicker
                        setTimeRange={value => {
                          setFormState({
                            ...formState,
                            timeRange: value,
                          });
                        }}
                        timeRange={formState.timeRange}
                      />
                    )}
                    <EuiSpacer size="l" />
                    <EuiAccordion
                      id="advancedOptions"
                      area-label={i18n.translate(
                        'xpack.ml.newJob.simple.recognize.advancedSettingsAriaLabel',
                        {
                          defaultMessage: 'Advanced settings',
                        }
                      )}
                      buttonContent={
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.advancedLabel"
                          defaultMessage="Advanced"
                        />
                      }
                      paddingSize="l"
                    >
                      <EuiDescribedFormGroup
                        idAria="ml_aria_label_new_job_dedicated_index"
                        title={
                          <h4>
                            <FormattedMessage
                              id="xpack.ml.newJob.simple.recognize.useDedicatedIndexLabel"
                              defaultMessage="Use dedicated index"
                            />
                          </h4>
                        }
                        description={
                          <FormattedMessage
                            id="xpack.ml.tooltips.newJobDedicatedIndexTooltip"
                            defaultMessage="Select to store results in a separate index for this job."
                          />
                        }
                      >
                        <EuiFormRow describedByIds={['ml_aria_label_new_job_dedicated_index']}>
                          <EuiSwitch
                            id="useDedicatedIndex"
                            name="useDedicatedIndex"
                            checked={formState.useDedicatedIndex}
                            onChange={({ target: { checked } }) => {
                              setFormState({
                                ...formState,
                                useDedicatedIndex: checked,
                              });
                            }}
                          />
                        </EuiFormRow>
                      </EuiDescribedFormGroup>
                    </EuiAccordion>
                    <EuiSpacer size="l" />
                  </EuiForm>
                  <EuiTextAlign textAlign="right">
                    <EuiButton
                      fill
                      type="submit"
                      isLoading={saveState === SAVE_STATE.SAVING}
                      disabled={!validationResult.formValid}
                      onClick={save}
                      area-label={i18n.translate(
                        'xpack.ml.newJob.simple.recognize.createJobButtonAriaLabel',
                        { defaultMessage: 'Create Job' }
                      )}
                    >
                      {saveState === SAVE_STATE.NOT_SAVED && (
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.createJobButtonLabel"
                          defaultMessage="Create {numberOfJobs, plural, zero {Job} one {Job} other {Jobs}}"
                          values={{ numberOfJobs: jobs.length }}
                        />
                      )}
                      {saveState === SAVE_STATE.SAVING && (
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.analysisRunningLabel"
                          defaultMessage="Analysis running"
                        />
                      )}
                    </EuiButton>
                  </EuiTextAlign>
                </>
              )}
              <CreateResultCallout
                saveState={saveState}
                resultsUrl={resultsUrl}
                onReset={loadModule}
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiPanel grow={false}>
              <ModuleJobs jobs={jobs} jobPrefix={formState.jobPrefix} saveState={saveState} />
            </EuiPanel>
            {Object.keys(kibanaObjects).length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiPanel grow={false}>
                  {Object.keys(kibanaObjects).map((objectType, i) => (
                    <Fragment key={objectType}>
                      <KibanaObjects
                        objectType={objectType}
                        kibanaObjects={kibanaObjects[objectType]}
                        isSaving={saveState === SAVE_STATE.SAVING}
                      />
                      {i < Object.keys(kibanaObjects).length - 1 && <EuiSpacer size="s" />}
                    </Fragment>
                  ))}
                </EuiPanel>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </EuiPageBody>
    </EuiPage>
  );
};
