/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
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

import { toMountPoint } from '../../../../../../../../../../src/plugins/kibana_react/public';
import { ToastNotificationText } from '../../../../components';
import { useApi } from '../../../../hooks/use_api';
import { useKibanaContext } from '../../../../lib/kibana';
import { RedirectToTransformManagement } from '../../../../common/navigation';
import { PROGRESS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants';

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

export const StepCreateForm: FC<Props> = React.memo(
  ({ createIndexPattern, transformConfig, transformId, onChange, overrides }) => {
    const defaults = { ...getDefaultStepCreateState(), ...overrides };

    const [redirectToTransformManagement, setRedirectToTransformManagement] = useState(false);

    const [created, setCreated] = useState(defaults.created);
    const [started, setStarted] = useState(defaults.started);
    const [indexPatternId, setIndexPatternId] = useState(defaults.indexPatternId);
    const [progressPercentComplete, setProgressPercentComplete] = useState<undefined | number>(
      undefined
    );

    const kibanaContext = useKibanaContext();

    useEffect(() => {
      onChange({ created, started, indexPatternId });
      // custom comparison
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [created, started, indexPatternId]);

    const api = useApi();

    async function createTransform() {
      setCreated(true);

      try {
        const resp = await api.createTransform(transformId, transformConfig);
        if (resp.errors !== undefined && Array.isArray(resp.errors)) {
          if (resp.errors.length === 1) {
            throw resp.errors[0];
          }

          if (resp.errors.length > 1) {
            throw resp.errors;
          }
        }

        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.stepCreateForm.createTransformSuccessMessage', {
            defaultMessage: 'Request to create transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      } catch (e) {
        setCreated(false);
        toastNotifications.addDanger({
          title: i18n.translate('xpack.transform.stepCreateForm.createTransformErrorMessage', {
            defaultMessage: 'An error occurred creating the transform {transformId}:',
            values: { transformId },
          }),
          text: toMountPoint(<ToastNotificationText text={e} />),
        });
        return false;
      }

      if (createIndexPattern) {
        createKibanaIndexPattern();
      }

      return true;
    }

    async function startTransform() {
      setStarted(true);

      try {
        await api.startTransforms([{ id: transformId }]);
        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.stepCreateForm.startTransformSuccessMessage', {
            defaultMessage: 'Request to start transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      } catch (e) {
        setStarted(false);
        toastNotifications.addDanger({
          title: i18n.translate('xpack.transform.stepCreateForm.startTransformErrorMessage', {
            defaultMessage: 'An error occurred starting the transform {transformId}:',
            values: { transformId },
          }),
          text: toMountPoint(<ToastNotificationText text={e} />),
        });
      }
    }

    async function createAndStartTransform() {
      const acknowledged = await createTransform();
      if (acknowledged) {
        await startTransform();
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
            i18n.translate('xpack.transform.stepCreateForm.duplicateIndexPatternErrorMessage', {
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
          i18n.translate('xpack.transform.stepCreateForm.createIndexPatternSuccessMessage', {
            defaultMessage: 'Kibana index pattern {indexPatternName} created successfully.',
            values: { indexPatternName },
          })
        );

        setIndexPatternId(id);
        return true;
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate('xpack.transform.stepCreateForm.createIndexPatternErrorMessage', {
            defaultMessage:
              'An error occurred creating the Kibana index pattern {indexPatternName}:',
            values: { indexPatternName },
          }),
          text: toMountPoint(<ToastNotificationText text={e} />),
        });
        return false;
      }
    };

    const isBatchTransform = typeof transformConfig.sync === 'undefined';

    if (started === true && progressPercentComplete === undefined && isBatchTransform) {
      // wrapping in function so we can keep the interval id in local scope
      function startProgressBar() {
        const interval = setInterval(async () => {
          try {
            const stats = await api.getTransformsStats(transformId);
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
            toastNotifications.addDanger({
              title: i18n.translate('xpack.transform.stepCreateForm.progressErrorMessage', {
                defaultMessage: 'An error occurred getting the progress percentage:',
              }),
              text: toMountPoint(<ToastNotificationText text={e} />),
            });
            clearInterval(interval);
          }
        }, PROGRESS_REFRESH_INTERVAL_MS);
        setProgressPercentComplete(0);
      }

      startProgressBar();
    }

    function getTransformConfigDevConsoleStatement() {
      return `PUT _transform/${transformId}\n${JSON.stringify(transformConfig, null, 2)}\n\n`;
    }

    // TODO move this to SASS
    const FLEX_GROUP_STYLE = { height: '90px', maxWidth: '800px' };
    const FLEX_ITEM_STYLE = { width: '200px' };
    const PANEL_ITEM_STYLE = { width: '300px' };

    if (redirectToTransformManagement) {
      return <RedirectToTransformManagement />;
    }

    return (
      <div data-test-subj="transformStepCreateForm">
        <EuiForm>
          {!created && (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={created && started}
                  onClick={createAndStartTransform}
                  data-test-subj="transformWizardCreateAndStartButton"
                >
                  {i18n.translate('xpack.transform.stepCreateForm.createAndStartTransformButton', {
                    defaultMessage: 'Create and start',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate(
                    'xpack.transform.stepCreateForm.createAndStartTransformDescription',
                    {
                      defaultMessage:
                        'Creates and starts the transform. A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the transform.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {created && (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={created && started}
                  onClick={startTransform}
                  data-test-subj="transformWizardStartButton"
                >
                  {i18n.translate('xpack.transform.stepCreateForm.startTransformButton', {
                    defaultMessage: 'Start',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.transform.stepCreateForm.startTransformDescription', {
                    defaultMessage:
                      'Starts the transform. A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the transform.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton
                isDisabled={created}
                onClick={createTransform}
                data-test-subj="transformWizardCreateButton"
              >
                {i18n.translate('xpack.transform.stepCreateForm.createTransformButton', {
                  defaultMessage: 'Create',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.transform.stepCreateForm.createTransformDescription', {
                  defaultMessage:
                    'Create the transform without starting it. You will be able to start the transform later by returning to the transforms list.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiCopy textToCopy={getTransformConfigDevConsoleStatement()}>
                {(copy: () => void) => (
                  <EuiButton
                    onClick={copy}
                    style={{ width: '100%' }}
                    data-test-subj="transformWizardCopyToClipboardButton"
                  >
                    {i18n.translate(
                      'xpack.transform.stepCreateForm.copyTransformConfigToClipboardButton',
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
                  'xpack.transform.stepCreateForm.copyTransformConfigToClipboardDescription',
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
                  {i18n.translate('xpack.transform.stepCreateForm.progressTitle', {
                    defaultMessage: 'Progress',
                  })}
                </strong>
              </EuiText>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem style={{ width: '400px' }} grow={false}>
                  <EuiProgress
                    size="l"
                    color="primary"
                    value={progressPercentComplete}
                    max={100}
                    data-test-subj="transformWizardProgressBar"
                  />
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
                    title={i18n.translate('xpack.transform.stepCreateForm.transformListCardTitle', {
                      defaultMessage: 'Transforms',
                    })}
                    description={i18n.translate(
                      'xpack.transform.stepCreateForm.transformListCardDescription',
                      {
                        defaultMessage: 'Return to the transform management page.',
                      }
                    )}
                    onClick={() => setRedirectToTransformManagement(true)}
                    data-test-subj="transformWizardCardManagement"
                  />
                </EuiFlexItem>
                {started === true && createIndexPattern === true && indexPatternId === undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE}>
                    <EuiPanel style={{ position: 'relative' }}>
                      <EuiProgress size="xs" color="primary" position="absolute" />
                      <EuiText color="subdued" size="s">
                        <p>
                          {i18n.translate(
                            'xpack.transform.stepCreateForm.creatingIndexPatternMessage',
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
                      title={i18n.translate('xpack.transform.stepCreateForm.discoverCardTitle', {
                        defaultMessage: 'Discover',
                      })}
                      description={i18n.translate(
                        'xpack.transform.stepCreateForm.discoverCardDescription',
                        {
                          defaultMessage: 'Use Discover to explore the transform.',
                        }
                      )}
                      href={getDiscoverUrl(indexPatternId, kibanaContext.kbnBaseUrl)}
                      data-test-subj="transformWizardCardDiscover"
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGrid>
            </Fragment>
          )}
        </EuiForm>
      </div>
    );
  }
);
