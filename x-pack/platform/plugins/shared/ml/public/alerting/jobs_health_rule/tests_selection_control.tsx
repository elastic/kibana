/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import {
  EuiButtonGroup,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JobsHealthRuleTestsConfig, JobsHealthTests } from '@kbn/ml-common-types/alerts';
import { getResultJobsHealthRuleConfig } from '../../../common/util/alerts';
import { HEALTH_CHECK_NAMES } from '../../../common/constants/alerts';
import { TimeIntervalControl } from '../time_interval_control';

interface TestsSelectionControlProps {
  config: JobsHealthRuleTestsConfig;
  onChange: (update: JobsHealthRuleTestsConfig) => void;
  errors?: string[];
}

type DelayedDataThresholdType = 'count' | 'percentage';

const isDelayedDataThresholdType = (id: string): id is DelayedDataThresholdType => {
  return id === 'count' || id === 'percentage';
};

export const TestsSelectionControl: FC<TestsSelectionControlProps> = React.memo(
  ({ config, onChange, errors }) => {
    const uiConfig = getResultJobsHealthRuleConfig(config);

    const updateCallback = useCallback(
      (update: Partial<Exclude<JobsHealthRuleTestsConfig, undefined>>) => {
        onChange({
          ...(config ?? {}),
          ...update,
        });
      },
      [onChange, config]
    );

    return (
      <>
        <EuiForm component="div" isInvalid={!!errors?.length} error={errors}>
          {(
            Object.entries(uiConfig) as Array<[JobsHealthTests, (typeof uiConfig)[JobsHealthTests]]>
          ).map(([name, conf], i) => {
            return (
              <EuiDescribedFormGroup
                key={name}
                title={<h4>{HEALTH_CHECK_NAMES[name]?.name}</h4>}
                description={HEALTH_CHECK_NAMES[name]?.description}
                fullWidth
                gutterSize={'s'}
              >
                <EuiFormRow>
                  <EuiSwitch
                    label={
                      <FormattedMessage
                        id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.enableTestLabel"
                        defaultMessage="Enable"
                      />
                    }
                    onChange={updateCallback.bind(null, {
                      [name]: {
                        ...uiConfig[name],
                        enabled: !uiConfig[name].enabled,
                      },
                    })}
                    checked={uiConfig[name].enabled}
                  />
                </EuiFormRow>

                {name === 'delayedData' && uiConfig.delayedData.enabled ? (
                  <>
                    <EuiSpacer size="m" />

                    <EuiButtonGroup
                      legend={i18n.translate(
                        'xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.thresholdTypeLegend',
                        { defaultMessage: 'Threshold type' }
                      )}
                      options={[
                        {
                          id: 'count',
                          label: (
                            <FormattedMessage
                              id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.thresholdTypeCount"
                              defaultMessage="Number"
                            />
                          ),
                        },
                        {
                          id: 'percentage',
                          label: (
                            <FormattedMessage
                              id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.thresholdTypePercentage"
                              defaultMessage="Percentage"
                            />
                          ),
                        },
                      ]}
                      idSelected={uiConfig.delayedData.thresholdType}
                      onChange={(id: string) => {
                        if (!isDelayedDataThresholdType(id)) return;

                        updateCallback({
                          [name]: {
                            ...uiConfig[name],
                            thresholdType: id,
                          },
                        });
                      }}
                    />

                    <EuiSpacer size="m" />

                    {uiConfig.delayedData.thresholdType === 'percentage' ? (
                      <EuiFormRow
                        label={
                          <>
                            <FormattedMessage
                              id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountPercentageLabel"
                              defaultMessage="Percentage"
                            />{' '}
                            <EuiIconTip
                              position="bottom"
                              content={
                                <FormattedMessage
                                  id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountPercentageHint"
                                  defaultMessage="Alert when the datafeed misses at least this percentage of total documents in the delayed window."
                                />
                              }
                              type="question"
                            />
                          </>
                        }
                      >
                        <EuiFieldNumber
                          value={uiConfig.delayedData.docsCountPercentage ?? 20}
                          onChange={(e) => {
                            updateCallback({
                              [name]: {
                                ...uiConfig[name],
                                docsCountPercentage: Number(e.target.value),
                              },
                            });
                          }}
                          min={1}
                          max={100}
                          append={i18n.translate(
                            'xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountPercentageAppend',
                            { defaultMessage: '% Missing documents' }
                          )}
                        />
                      </EuiFormRow>
                    ) : (
                      <EuiFormRow
                        label={
                          <>
                            <FormattedMessage
                              id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountLabel"
                              defaultMessage="Number"
                            />{' '}
                            <EuiIconTip
                              position="bottom"
                              content={
                                <FormattedMessage
                                  id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountHint"
                                  defaultMessage="The threshold for the amount of missing documents to alert upon."
                                />
                              }
                              type="question"
                            />
                          </>
                        }
                      >
                        <EuiFieldNumber
                          value={uiConfig.delayedData.docsCount}
                          onChange={(e) => {
                            updateCallback({
                              [name]: {
                                ...uiConfig[name],
                                docsCount: Number(e.target.value),
                              },
                            });
                          }}
                          min={1}
                          append={i18n.translate(
                            'xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.docsCountAppend',
                            { defaultMessage: 'Missing documents' }
                          )}
                        />
                      </EuiFormRow>
                    )}

                    <EuiSpacer size="m" />

                    <TimeIntervalControl
                      label={
                        <>
                          <FormattedMessage
                            id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.timeIntervalLabel"
                            defaultMessage="Time interval"
                          />{' '}
                          <EuiIconTip
                            position="bottom"
                            content={
                              <FormattedMessage
                                id="xpack.ml.alertTypes.jobsHealthAlertingRule.testsSelection.delayedData.timeIntervalHint"
                                defaultMessage="The lookback interval to check during rule execution for delayed data. By default derived from the longest bucket span and query delay."
                              />
                            }
                            type="question"
                          />
                        </>
                      }
                      value={uiConfig.delayedData.timeInterval}
                      onChange={(e) => {
                        updateCallback({
                          [name]: {
                            ...uiConfig[name],
                            timeInterval: e,
                          },
                        });
                      }}
                    />
                  </>
                ) : null}
              </EuiDescribedFormGroup>
            );
          })}
        </EuiForm>
        <EuiSpacer size="l" />
      </>
    );
  }
);
