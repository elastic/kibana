/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { Fragment } from 'react';
import React from 'react';

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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AssetTitleMap } from '../../../constants';
import type { DisplayedAssetTypes, GetBulkAssetsResponse } from '../../../../../../../../common';
import { useStartServices } from '../../../../../hooks';
import { KibanaAssetType } from '../../../../../types';

export type DisplayedAssetType = DisplayedAssetTypes[number] | 'view';

const ALERTING_ENGINE_V1_BADGE = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV1BadgeLabel',
  { defaultMessage: 'v1' }
);

const ALERTING_ENGINE_V2_BADGE = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV2BadgeLabel',
  { defaultMessage: 'v2' }
);

const ALERTING_ENGINE_V1_ARIA_LABEL = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV1BadgeAriaLabel',
  { defaultMessage: 'Alerting v1' }
);

const ALERTING_ENGINE_V2_ARIA_LABEL = i18n.translate(
  'xpack.fleet.epm.assets.alertingEngineV2BadgeAriaLabel',
  { defaultMessage: 'Alerting v2' }
);

const getAlertingEngineBadge = (
  type: DisplayedAssetType,
  engine: GetBulkAssetsResponse['items'][number]['attributes']['engine']
): { label: string; ariaLabel: string } | undefined => {
  if (type !== KibanaAssetType.alertingRuleTemplate) {
    return undefined;
  }

  if (engine === 'v2') {
    return { label: ALERTING_ENGINE_V2_BADGE, ariaLabel: ALERTING_ENGINE_V2_ARIA_LABEL };
  }

  return { label: ALERTING_ENGINE_V1_BADGE, ariaLabel: ALERTING_ENGINE_V1_ARIA_LABEL };
};

export const AssetsAccordion: FunctionComponent<{
  type: DisplayedAssetType;
  savedObjects: GetBulkAssetsResponse['items'];
}> = ({ savedObjects, type }) => {
  const { http } = useStartServices();

  const isDashboard = type === KibanaAssetType.dashboard;

  return (
    <EuiAccordion
      initialIsOpen={isDashboard}
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
              <h3>{savedObjects.length}</h3>
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={type}
    >
      <>
        <EuiSpacer size="m" />
        <EuiSplitPanel.Outer
          hasBorder
          hasShadow={false}
          data-test-subj={`fleetAssetsAccordion.content.${type}`}
        >
          {savedObjects.map(({ id, attributes, appLink }, idx) => {
            const { title: soTitle, description, engine } = attributes || {};
            // Ignore custom asset views or if not a Kibana asset
            if (type === 'view') {
              return;
            }

            const title = soTitle ?? id;
            const engineBadge = getAlertingEngineBadge(type, engine);
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
                {idx + 1 < savedObjects.length && <EuiHorizontalRule margin="none" />}
              </Fragment>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
