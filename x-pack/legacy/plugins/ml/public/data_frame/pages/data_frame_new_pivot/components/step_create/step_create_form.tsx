/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  EuiButton,
  // Module '"@elastic/eui"' has no exported member 'EuiCard'.
  // @ts-ignore
  EuiCard,
  EuiCopy,
  // Module '"@elastic/eui"' has no exported member 'EuiDescribedFormGroup'.
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { ml } from '../../../../../services/ml_api_service';
import { useKibanaContext } from '../../../../../contexts/kibana/use_kibana_context';
import { useUiChromeContext } from '../../../../../contexts/ui/use_ui_chrome_context';
import { PROGRESS_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';

import { getTransformProgress, getDiscoverUrl } from '../../../../common';

export interface StepDetailsExposedState {
  created: boolean;
  started: boolean;
  indexPatternId: string | undefined;
}

export function getDefaultStepCreateState(): StepDetailsExposedState {
  return {
    created: false,
    started: false,
    indexPatternId: undefined,
  };
}

interface Props {
  createIndexPattern: boolean;
  transformId: string;
  transformConfig: any;
  overrides: StepDetailsExposedState;
  onChange(s: StepDetailsExposedState): void;
}

export const StepCreateForm: SFC<Props> = React.memo(
  ({ createIndexPattern, transformConfig, transformId, onChange, overrides }) => {
    const defaults = { ...getDefaultStepCreateState(), ...overrides };

    const [created, setCreated] = useState(defaults.created);
    const [started, setStarted] = useState(defaults.started);
    const [indexPatternId, setIndexPatternId] = useState(defaults.indexPatternId);
    const [progressPercentComplete, setProgressPercentComplete] = useState<undefined | number>(
      undefined
    );

    const kibanaContext = useKibanaContext();
    const baseUrl = useUiChromeContext().addBasePath(kibanaContext.kbnBaseUrl);

    useEffect(() => {
      onChange({ created, started, indexPatternId });
    }, [created, started, indexPatternId]);

    async function createDataFrame() {
      setCreated(true);

      try {
        await ml.dataFrame.createDataFrameTransform(transformId, transformConfig);
        toastNotifications.addSuccess(
          i18n.translate('xpack.ml.dataframe.stepCreateForm.createTransformSuccessMessage', {
            defaultMessage: 'Request to create data frame transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      } catch (e) {
        setCreated(false);
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.stepCreateForm.createTransformErrorMessage', {
            defaultMessage:
              'An error occurred creating the data frame transform {transformId}: {error}',
            values: { transformId, error: JSON.stringify(e) },
          })
        );
        return false;
      }

      if (createIndexPattern) {
        createKibanaIndexPattern();
      }

      return true;
    }

    async function startDataFrame() {
      setStarted(true);

      try {
        await ml.dataFrame.startDataFrameTransforms([{ id: transformId }]);
        toastNotifications.addSuccess(
          i18n.translate('xpack.ml.dataframe.stepCreateForm.startTransformSuccessMessage', {
            defaultMessage: 'Request to start data frame transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      } catch (e) {
        setStarted(false);
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.stepCreateForm.startTransformErrorMessage', {
            defaultMessage:
              'An error occurred starting the data frame transform {transformId}: {error}',
            values: { transformId, error: JSON.stringify(e) },
          })
        );
      }
    }

    async function createAndStartDataFrame() {
      const success = await createDataFrame();
      if (success) {
        await startDataFrame();
      }
    }

    const createKibanaIndexPattern = async () => {
      const indexPatternName = transformConfig.dest.index;

      try {
        const newIndexPattern = await kibanaContext.indexPatterns.make();

        Object.assign(newIndexPattern, {
          id: '',
          title: indexPatternName,
        });

        const id = await newIndexPattern.create();

        // id returns false if there's a duplicate index pattern.
        if (id === false) {
          toastNotifications.addDanger(
            i18n.translate('xpack.ml.dataframe.stepCreateForm.duplicateIndexPatternErrorMessage', {
              defaultMessage:
                'An error occurred creating the Kibana index pattern {indexPatternName}: The index pattern already exists.',
              values: { indexPatternName },
            })
          );
          return;
        }

        // check if there's a default index pattern, if not,
        // set the newly created one as the default index pattern.
        if (!kibanaContext.kibanaConfig.get('defaultIndex')) {
          await kibanaContext.kibanaConfig.set('defaultIndex', id);
        }

        toastNotifications.addSuccess(
          i18n.translate('xpack.ml.dataframe.stepCreateForm.createIndexPatternSuccessMessage', {
            defaultMessage: 'Kibana index pattern {indexPatternName} created successfully.',
            values: { indexPatternName },
          })
        );

        setIndexPatternId(id);
        return true;
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.stepCreateForm.createIndexPatternErrorMessage', {
            defaultMessage:
              'An error occurred creating the Kibana index pattern {indexPatternName}: {error}',
            values: { indexPatternName, error: JSON.stringify(e) },
          })
        );
        return false;
      }
    };

    const isBatchTransform = typeof transformConfig.sync === 'undefined';

    if (started === true && progressPercentComplete === undefined && isBatchTransform) {
      // wrapping in function so we can keep the interval id in local scope
      function startProgressBar() {
        const interval = setInterval(async () => {
          try {
            const stats = await ml.dataFrame.getDataFrameTransformsStats(transformId);
            if (stats && Array.isArray(stats.transforms) && stats.transforms.length > 0) {
              const percent =
                getTransformProgress({
                  id: transformConfig.id,
                  config: transformConfig,
                  stats: stats.transforms[0],
                }) || 0;
              setProgressPercentComplete(percent);
              if (percent >= 100) {
                clearInterval(interval);
              }
            }
          } catch (e) {
            toastNotifications.addDanger(
              i18n.translate('xpack.ml.dataframe.stepCreateForm.progressErrorMessage', {
                defaultMessage: 'An error occurred getting the progress percentage: {error}',
                values: { error: JSON.stringify(e) },
              })
            );
            clearInterval(interval);
          }
        }, PROGRESS_JOBS_REFRESH_INTERVAL_MS);
        setProgressPercentComplete(0);
      }

      startProgressBar();
    }

    function getTransformConfigDevConsoleStatement() {
      return `PUT _data_frame/transforms/${transformId}\n${JSON.stringify(
        transformConfig,
        null,
        2
      )}\n\n`;
    }

    // TODO move this to SASS
    const FLEX_GROUP_STYLE = { height: '90px', maxWidth: '800px' };
    const FLEX_ITEM_STYLE = { width: '200px' };
    const PANEL_ITEM_STYLE = { width: '300px' };

    return (
      <EuiForm>
        {!created && (
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton fill isDisabled={created && started} onClick={createAndStartDataFrame}>
                {i18n.translate('xpack.ml.dataframe.stepCreateForm.createAndStartDataFrameButton', {
                  defaultMessage: 'Create and start',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.ml.dataframe.stepCreateForm.createAndStartDataFrameDescription',
                  {
                    defaultMessage:
                      'Creates and starts the data frame transform. A data frame transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the data frame transform.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {created && (
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton fill isDisabled={created && started} onClick={startDataFrame}>
                {i18n.translate('xpack.ml.dataframe.stepCreateForm.startDataFrameButton', {
                  defaultMessage: 'Start',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.ml.dataframe.stepCreateForm.startDataFrameDescription', {
                  defaultMessage:
                    'Starts the data frame transform. A data frame transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the data frame transform.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
          <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
            <EuiButton isDisabled={created} onClick={createDataFrame}>
              {i18n.translate('xpack.ml.dataframe.stepCreateForm.createDataFrameButton', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.ml.dataframe.stepCreateForm.createDataFrameDescription', {
                defaultMessage:
                  'Create the data frame transform without starting it. You will be able to start the transform later by returning to the data frame transforms list.',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
          <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
            <EuiCopy textToCopy={getTransformConfigDevConsoleStatement()}>
              {(copy: () => void) => (
                <EuiButton onClick={copy} style={{ width: '100%' }}>
                  {i18n.translate(
                    'xpack.ml.dataframe.stepCreateForm.copyTransformConfigToClipboardButton',
                    {
                      defaultMessage: 'Copy to clipboard',
                    }
                  )}
                </EuiButton>
              )}
            </EuiCopy>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.ml.dataframe.stepCreateForm.copyTransformConfigToClipboardDescription',
                {
                  defaultMessage:
                    'Copies to the clipboard the Kibana Dev Console command for creating the transform.',
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {progressPercentComplete !== undefined && isBatchTransform && (
          <Fragment>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.ml.dataframe.stepCreateForm.progressTitle', {
                  defaultMessage: 'Progress',
                })}
              </strong>
            </EuiText>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem style={{ width: '400px' }} grow={false}>
                <EuiProgress size="l" color="primary" value={progressPercentComplete} max={100} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">{progressPercentComplete}%</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        )}
        {created && (
          <Fragment>
            <EuiHorizontalRule />
            <EuiFlexGrid gutterSize="l">
              <EuiFlexItem style={PANEL_ITEM_STYLE}>
                <EuiCard
                  icon={<EuiIcon size="xxl" type="list" />}
                  title={i18n.translate(
                    'xpack.ml.dataframe.stepCreateForm.transformListCardTitle',
                    {
                      defaultMessage: 'Data frame transforms',
                    }
                  )}
                  description={i18n.translate(
                    'xpack.ml.dataframe.stepCreateForm.transformListCardDescription',
                    {
                      defaultMessage: 'Return to the data frame transform management page.',
                    }
                  )}
                  href="#/data_frames"
                />
              </EuiFlexItem>
              {started === true && createIndexPattern === true && indexPatternId === undefined && (
                <EuiFlexItem style={PANEL_ITEM_STYLE}>
                  <EuiPanel style={{ position: 'relative' }}>
                    <EuiProgress size="xs" color="primary" position="absolute" />
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.ml.dataframe.stepCreateForm.creatingIndexPatternMessage',
                          {
                            defaultMessage: 'Creating Kibana index pattern ...',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiPanel>
                </EuiFlexItem>
              )}
              {started === true && indexPatternId !== undefined && (
                <EuiFlexItem style={PANEL_ITEM_STYLE}>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="discoverApp" />}
                    title={i18n.translate('xpack.ml.dataframe.stepCreateForm.discoverCardTitle', {
                      defaultMessage: 'Discover',
                    })}
                    description={i18n.translate(
                      'xpack.ml.dataframe.stepCreateForm.discoverCardDescription',
                      {
                        defaultMessage: 'Use Discover to explore the data frame pivot.',
                      }
                    )}
                    href={getDiscoverUrl(indexPatternId, baseUrl)}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGrid>
          </Fragment>
        )}
      </EuiForm>
    );
  }
);
