/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { Fragment, useState } from 'react';

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSplitPanel,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';

import { AssetTitleMap } from '../../../constants';
import type { DisplayedAssetTypes, GetBulkAssetsResponse } from '../../../../../../../../common';
import { useStartServices } from '../../../../../hooks';
import { KibanaAssetType } from '../../../../../types';

export type DisplayedAssetType = DisplayedAssetTypes[number] | 'view';

type AlertingEngineTab = 'v2' | 'v1';

const isV2AlertingAsset = (asset: GetBulkAssetsResponse['items'][number]): boolean =>
  asset.attributes?.engine === 'v2';

const ALERTING_ENGINE_CLASSIC_BADGE = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineClassicBadgeLabel',
  { defaultMessage: 'Classic' }
);

const ALERTING_ENGINE_V2_BADGE = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV2BadgeLabel',
  { defaultMessage: 'v2' }
);

const ALERTING_ENGINE_CLASSIC_ARIA_LABEL = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineClassicBadgeAriaLabel',
  { defaultMessage: 'Classic Alerting' }
);

const ALERTING_ENGINE_V2_ARIA_LABEL = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV2BadgeAriaLabel',
  { defaultMessage: 'Alerting v2' }
);

const getAlertingEngineBadge = (
  engine: GetBulkAssetsResponse['items'][number]['attributes']['engine']
): { label: string; ariaLabel: string } => {
  if (engine === 'v2') {
    return { label: ALERTING_ENGINE_V2_BADGE, ariaLabel: ALERTING_ENGINE_V2_ARIA_LABEL };
  }

  return { label: ALERTING_ENGINE_CLASSIC_BADGE, ariaLabel: ALERTING_ENGINE_CLASSIC_ARIA_LABEL };
};

export const AssetsAccordion: FunctionComponent<{
  type: DisplayedAssetType;
  savedObjects: GetBulkAssetsResponse['items'];
}> = ({ savedObjects, type }) => {
  const startServices = useStartServices();
  const { http } = startServices;
  const hasV2Templates = savedObjects.some(isV2AlertingAsset);
  const [selectedEngineTab, setSelectedEngineTab] = useState<AlertingEngineTab>(
    hasV2Templates ? 'v2' : 'v1'
  );

  const isDashboard = type === KibanaAssetType.dashboard;
  const isAlertingRuleTemplate = type === KibanaAssetType.alertingRuleTemplate;
  const alertingV2Enabled = isAlertingV2Enabled(startServices);
  const showEngineUi = isAlertingRuleTemplate && hasV2Templates && alertingV2Enabled;

  const listedSavedObjects =
    isAlertingRuleTemplate && !alertingV2Enabled
      ? savedObjects.filter((asset) => !isV2AlertingAsset(asset))
      : savedObjects;

  const visibleSavedObjects = showEngineUi
    ? listedSavedObjects.filter((asset) =>
        selectedEngineTab === 'v2' ? isV2AlertingAsset(asset) : !isV2AlertingAsset(asset)
      )
    : listedSavedObjects;

  return (
    <EuiAccordion
      initialIsOpen={isDashboard || showEngineUi}
      data-test-subj={`fleetAssetsAccordion.button.${type}`}
      buttonContent={
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <h3>{AssetTitleMap[type]}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued" size="m">
              <h3>{listedSavedObjects.length}</h3>
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={type}
    >
      <>
        <EuiSpacer size="m" />
        {showEngineUi && (
          <>
            <EuiTabs data-test-subj="fleetAlertingEngineTabs">
              <EuiTab
                data-test-subj="fleetAlertingEngineTab-v2"
                onClick={() => setSelectedEngineTab('v2')}
                isSelected={selectedEngineTab === 'v2'}
              >
                <FormattedMessage
                  id="xpack.fleet.epm.assets.alertingV2TabLabel"
                  defaultMessage="Alerting v2"
                />
              </EuiTab>
              <EuiTab
                data-test-subj="fleetAlertingEngineTab-v1"
                onClick={() => setSelectedEngineTab('v1')}
                isSelected={selectedEngineTab === 'v1'}
              >
                <FormattedMessage
                  id="xpack.fleet.epm.assets.classicAlertingTabLabel"
                  defaultMessage="Classic Alerting"
                />
              </EuiTab>
            </EuiTabs>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiSplitPanel.Outer
          hasBorder
          hasShadow={false}
          data-test-subj={`fleetAssetsAccordion.content.${type}`}
        >
          {visibleSavedObjects.map(({ id, attributes, appLink }, idx) => {
            const { title: soTitle, description } = attributes || {};
            if (type === 'view') {
              return;
            }

            const title = soTitle ?? id;
            const engine = attributes?.engine;
            const engineBadge = showEngineUi ? getAlertingEngineBadge(engine) : undefined;
            return (
              <Fragment key={id}>
                <EuiSplitPanel.Inner
                  grow={false}
                  key={idx}
                  data-test-subj={`fleetAssetsAccordion.content.${type}.${title}`}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    justifyContent="flexStart"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="m">
                        <p>
                          {appLink ? (
                            <EuiLink href={http.basePath.prepend(appLink)}>{title}</EuiLink>
                          ) : (
                            title
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    {engineBadge && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color="hollow"
                          aria-label={engineBadge.ariaLabel}
                          data-test-subj={`fleetAssetsAccordion.engineBadge.${engine ?? 'v1'}`}
                        >
                          {engineBadge.label}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  {description && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="s" color="subdued">
                        <p>{description}</p>
                      </EuiText>
                    </>
                  )}
                </EuiSplitPanel.Inner>
                {idx + 1 < visibleSavedObjects.length && <EuiHorizontalRule margin="none" />}
              </Fragment>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
