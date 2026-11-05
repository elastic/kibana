/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useState, useMemo } from 'react';
import type { FunctionComponent, MouseEvent } from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiButton,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { ElasticsearchErrorDetails } from '@kbn/es-errors';

import type { AssetReference } from '../../../../../../../../common';

import {
  sendRequestInstallRuleAssets,
  sendRequestInstallWorkflowAssets,
  sendRequestReauthorizeTransforms,
  useAuthz,
  useStartServices,
} from '../../../../../../../hooks';

import { AssetTitleMap } from '../../../constants';

import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType } from '../../../../../types';
import { KibanaSavedObjectType } from '../../../../../../../../common/types/models';

interface Props {
  packageInfo: PackageInfo;
  type:
    | ElasticsearchAssetType.transform
    | KibanaSavedObjectType.alert
    | KibanaSavedObjectType.workflow;
  deferredInstallations: AssetReference[];
  forceRefreshAssets?: () => void;
}

export const getDeferredAssetDescription = (
  assetType: string,
  assetCount: number,
  permissions: { canEdit: boolean }
) => {
  switch (assetType) {
    case ElasticsearchAssetType.transform:
      if (permissions.canEdit) {
        return i18n.translate(
          'xpack.fleet.epm.packageDetails.assets.deferredTransformReauthorizeDescription',
          {
            defaultMessage:
              '{assetCount, plural, one {Transform was installed but requires} other {# transforms were installed but require}} additional permissions to run. Reauthorize the {assetCount, plural, one {transform} other {transforms}} to start operations.',
            values: { assetCount: assetCount ?? 1 },
          }
        );
      }
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredTransformRequestPermissionDescription',
        {
          defaultMessage:
            '{assetCount, plural, one {Transform was installed but requires} other {# transforms were installed but require}} additional permissions to run. Contact your administrator to request the required privileges.',
          values: { assetCount: assetCount ?? 1 },
        }
      );
    case KibanaSavedObjectType.workflow:
      if (permissions.canEdit) {
        return i18n.translate(
          'xpack.fleet.epm.packageDetails.assets.deferredWorkflowsRetryDescription',
          {
            defaultMessage:
              '{assetCount, plural, one {Workflow was} other {# workflows were}} not installed because of a license restriction or temporary unavailability. Retry the install, or check the Kibana logs for details.',
            values: { assetCount: assetCount ?? 1 },
          }
        );
      }
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredWorkflowsRequestPermissionDescription',
        {
          defaultMessage:
            '{assetCount, plural, one {Workflow was} other {# workflows were}} not installed because of a license restriction or temporary unavailability. Contact your administrator to install packages, or check the Kibana logs for details.',
          values: { assetCount: assetCount ?? 1 },
        }
      );
    default:
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredInstallationsDescription',
        {
          defaultMessage: 'Asset requires additional permissions.',
        }
      );
  }
};

export const DeferredAssetsAccordion: FunctionComponent<Props> = ({
  packageInfo,
  type,
  deferredInstallations,
  forceRefreshAssets,
}) => {
  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(false);
  const deferredAssets = useMemo(
    () =>
      deferredInstallations.map((i) => ({
        id: i.id,
        attributes: {
          title: i.id,
          description: i.type,
        },
      })),
    [deferredInstallations]
  );

  const authz = useAuthz();
  const canEdit = useMemo(() => {
    if (type === ElasticsearchAssetType.transform) {
      return (
        authz.packagePrivileges?.transform?.actions?.canStartStopTransform?.executePackageAction ??
        false
      );
    } else if (type === KibanaSavedObjectType.alert || type === KibanaSavedObjectType.workflow) {
      return authz.integrations?.installPackages;
    }

    return false;
  }, [type, authz]);

  const authorizeTransforms = useCallback(
    async (transformIds: Array<{ transformId: string }>) => {
      setIsLoading(true);
      notifications.toasts.addInfo(
        i18n.translate('xpack.fleet.epm.packageDetails.assets.authorizeTransformsAcknowledged', {
          defaultMessage:
            'Request to authorize {count, plural, one {# transform} other {# transforms}} acknowledged.',
          values: { count: transformIds.length },
        }),
        { toastLifeTimeMs: 500 }
      );

      try {
        const reauthorizeTransformResp = await sendRequestReauthorizeTransforms(
          packageInfo.name,
          packageInfo.version,
          transformIds
        );

        if (Array.isArray(reauthorizeTransformResp)) {
          const error = reauthorizeTransformResp.find((d) => d.error)?.error;

          const cntAuthorized = reauthorizeTransformResp.filter((d) => d.success).length;
          if (error) {
            const errorBody = error.meta?.body as ElasticsearchErrorDetails;
            const errorMsg = errorBody
              ? `${errorBody.error?.type}: ${errorBody.error?.reason}`
              : `${error.message}`;

            notifications.toasts.addError(
              { name: errorMsg, message: errorMsg },
              {
                title: i18n.translate(
                  'xpack.fleet.epm.packageDetails.assets.authorizeTransformsUnsuccessful',
                  {
                    defaultMessage:
                      'Unable to authorize {cntUnauthorized, plural, one {# transform} other {# transforms}}.',
                    values: { cntUnauthorized: transformIds.length - cntAuthorized },
                  }
                ),
                toastLifeTimeMs: 1000,
              }
            );
          } else {
            notifications.toasts.addSuccess(
              i18n.translate(
                'xpack.fleet.epm.packageDetails.assets.authorizeTransformsSuccessful',
                {
                  defaultMessage:
                    'Successfully authorized {count, plural, one {# transform} other {# transforms}}.',
                  values: { count: cntAuthorized },
                }
              ),
              { toastLifeTimeMs: 1000 }
            );
          }
        }
      } catch (e) {
        notifications.toasts.addError(e, {
          title: i18n.translate(
            'xpack.fleet.epm.packageDetails.assets.unableToAuthorizeAllTransformsError',
            {
              defaultMessage: 'An error occurred authorizing and starting transforms.',
            }
          ),
        });
      }
      if (forceRefreshAssets) {
        forceRefreshAssets();
      }
      setIsLoading(false);
    },
    [notifications.toasts, packageInfo.name, packageInfo.version, forceRefreshAssets]
  );

  const createRules = useCallback(
    async (alertIds: Array<string>) => {
      setIsLoading(true);
      notifications.toasts.addInfo(
        i18n.translate('xpack.fleet.epm.packageDetails.assets.creatingRules', {
          defaultMessage: 'Creating {count, plural, one {# rule} other {# rules}}.',
          values: { count: alertIds.length },
        }),
        { toastLifeTimeMs: 500 }
      );

      try {
        await sendRequestInstallRuleAssets(packageInfo.name, packageInfo.version);

        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.epm.packageDetails.assets.createRulesSuccess', {
            defaultMessage: 'Successfully created {count, plural, one {# rule} other {# rules}}.',
            values: { count: alertIds.length },
          }),
          { toastLifeTimeMs: 1000 }
        );
      } catch (e) {
        notifications.toasts.addError(e, {
          title: i18n.translate('xpack.fleet.epm.packageDetails.assets.createRulesError', {
            defaultMessage: 'An error occurred creating rules.',
          }),
        });
      }
      if (forceRefreshAssets) {
        forceRefreshAssets();
      }
      setIsLoading(false);
    },
    [notifications.toasts, packageInfo.name, packageInfo.version, forceRefreshAssets]
  );

  const retryInstallWorkflows = useCallback(
    async (workflowCount: number) => {
      setIsLoading(true);
      notifications.toasts.addInfo(
        i18n.translate('xpack.fleet.epm.packageDetails.assets.retryingWorkflowInstall', {
          defaultMessage:
            'Retrying install for {count, plural, one {# workflow} other {# workflows}}.',
          values: { count: workflowCount },
        }),
        { toastLifeTimeMs: 500 }
      );

      try {
        await sendRequestInstallWorkflowAssets(packageInfo.name, packageInfo.version);

        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.epm.packageDetails.assets.retryWorkflowInstallSuccess', {
            defaultMessage:
              'Successfully retried install for {count, plural, one {# workflow} other {# workflows}}.',
            values: { count: workflowCount },
          }),
          { toastLifeTimeMs: 1000 }
        );
      } catch (e) {
        notifications.toasts.addError(e, {
          title: i18n.translate('xpack.fleet.epm.packageDetails.assets.retryWorkflowInstallError', {
            defaultMessage: 'An error occurred retrying workflow install.',
          }),
        });
      }
      if (forceRefreshAssets) {
        forceRefreshAssets();
      }
      setIsLoading(false);
    },
    [notifications.toasts, packageInfo.name, packageInfo.version, forceRefreshAssets]
  );

  if (deferredAssets.length === 0) return null;
  return (
    <EuiAccordion
      initialIsOpen={true}
      buttonContent={
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <h3>{AssetTitleMap[type]}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="accent" size="m">
              <h3>{deferredAssets.length}</h3>
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={type}
    >
      <>
        <EuiSpacer size="m" />

        <EuiText>
          {getDeferredAssetDescription(type, deferredInstallations.length, {
            canEdit,
          })}{' '}
        </EuiText>
        <EuiSpacer size="m" />

        <EuiButton
          data-test-subject={`fleetAssetsReauthorizeAll`}
          disabled={!canEdit}
          isLoading={isLoading}
          size={'m'}
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (type === ElasticsearchAssetType.transform) {
              authorizeTransforms(deferredAssets.map((t) => ({ transformId: t.id })));
            } else if (type === KibanaSavedObjectType.alert) {
              createRules(deferredAssets.map(({ id }) => id));
            } else if (type === KibanaSavedObjectType.workflow) {
              retryInstallWorkflows(deferredAssets.length);
            }
          }}
          aria-label={getDeferredAssetDescription(type, deferredInstallations.length, {
            canEdit,
          })}
        >
          {type === ElasticsearchAssetType.transform
            ? i18n.translate('xpack.fleet.epm.packageDetails.assets.reauthorizeAllButton', {
                defaultMessage: 'Reauthorize all',
              })
            : null}

          {type === KibanaSavedObjectType.alert
            ? i18n.translate('xpack.fleet.epm.packageDetails.assets.createRulesButton', {
                defaultMessage: 'Create rules',
              })
            : null}

          {type === KibanaSavedObjectType.workflow
            ? i18n.translate('xpack.fleet.epm.packageDetails.assets.retryWorkflowInstallButton', {
                defaultMessage: 'Retry install',
              })
            : null}
        </EuiButton>

        <EuiSpacer size="m" />

        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          {deferredAssets.map(({ id: assetId }, idx) => {
            return (
              <Fragment key={assetId}>
                <EuiSplitPanel.Inner grow={false} key={`${assetId}-${idx}`}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={8}>
                      <EuiText size="m">
                        <p>{assetId}</p>
                      </EuiText>
                    </EuiFlexItem>
                    {type === ElasticsearchAssetType.transform ? (
                      <EuiFlexItem>
                        <EuiToolTip
                          content={
                            canEdit ? undefined : getDeferredAssetDescription(type, 1, { canEdit })
                          }
                          data-test-subject={`fleetAssetsReauthorizeTooltip-${assetId}-${isLoading}`}
                        >
                          <EuiButton
                            isLoading={isLoading}
                            disabled={!canEdit}
                            size={'s'}
                            onClick={(e: MouseEvent<HTMLButtonElement>) => {
                              e.preventDefault();
                              authorizeTransforms([{ transformId: assetId }]);
                            }}
                          >
                            {i18n.translate(
                              'xpack.fleet.epm.packageDetails.assets.reauthorizeButton',
                              {
                                defaultMessage: 'Reauthorize',
                              }
                            )}
                          </EuiButton>
                        </EuiToolTip>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
                {idx + 1 < deferredAssets.length && <EuiHorizontalRule margin="none" />}
              </Fragment>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
