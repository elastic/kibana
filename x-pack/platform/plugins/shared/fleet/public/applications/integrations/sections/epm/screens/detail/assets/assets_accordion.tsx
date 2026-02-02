/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { Fragment, useMemo } from 'react';
import React from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';

import { rulesAppRoute, triggersActionsRoute } from '@kbn/rule-data-utils';

import { AssetTitleMap } from '../../../constants';
import type { DisplayedAssetTypes, GetBulkAssetsResponse } from '../../../../../../../../common';
import { useStartServices } from '../../../../../hooks';
import { KibanaAssetType } from '../../../../../types';

export type DisplayedAssetType = DisplayedAssetTypes[number] | 'view';

/**
 * Transforms the appLink to use the new unified rules app URL when the feature flag is enabled.
 * When the rules app is registered (unifiedRulesPage feature flag is enabled), URLs pointing to
 * the legacy triggersActions page are redirected to /app/rules.
 */
const getTransformedAppLink = (appLink: string | undefined, isUnifiedRulesPageEnabled: boolean) => {
  if (!appLink) return appLink;
  if (!isUnifiedRulesPageEnabled) return appLink;

  // Transform legacy triggersActions URLs to the new rules app URL
  if (appLink.startsWith(triggersActionsRoute)) {
    return appLink.replace(triggersActionsRoute, rulesAppRoute);
  }

  return appLink;
};

export const AssetsAccordion: FunctionComponent<{
  type: DisplayedAssetType;
  savedObjects: GetBulkAssetsResponse['items'];
}> = ({ savedObjects, type }) => {
  const { http, application } = useStartServices();

  const isUnifiedRulesPageEnabled = useMemo(
    () => application?.isAppRegistered?.('rules') ?? false,
    [application]
  );

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
            const { title: soTitle, description } = attributes || {};
            // Ignore custom asset views or if not a Kibana asset
            if (type === 'view') {
              return;
            }

            const title = soTitle ?? id;
            const transformedAppLink = getTransformedAppLink(appLink, isUnifiedRulesPageEnabled);
            return (
              <Fragment key={id}>
                <EuiSplitPanel.Inner
                  grow={false}
                  key={idx}
                  data-test-subj={`fleetAssetsAccordion.content.${type}.${title}`}
                >
                  <EuiText size="m">
                    <p>
                      {transformedAppLink ? (
                        <EuiLink href={http.basePath.prepend(transformedAppLink)}>{title}</EuiLink>
                      ) : (
                        title
                      )}
                    </p>
                  </EuiText>
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
