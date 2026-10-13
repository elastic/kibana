/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment } from 'react';

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

import { AssetTitleMap } from '../../../constants';
import type { DisplayedAssetTypes } from '../../../../../../../../common';
import { useStartServices } from '../../../../../hooks';
import { KibanaAssetType } from '../../../../../types';

export type DisplayedAssetType = DisplayedAssetTypes[number] | 'view';

export interface AccordionAsset {
  id: string;
  appLink?: string;
  attributes?: {
    title?: string;
    description?: string;
  };
}

export interface AssetsAccordionProps<TAsset extends AccordionAsset = AccordionAsset> {
  type: DisplayedAssetType;
  savedObjects: TAsset[];
  itemCount?: number;
  initialIsOpen?: boolean;
  header?: ReactNode;
  titleExtra?: (asset: TAsset) => ReactNode;
  getTitleHref?: (asset: TAsset) => string | undefined;
}

const resolveAssetTitleHref = (
  titleHref: string,
  basePath: { get?: () => string; prepend: (path: string) => string }
): string => {
  const currentBasePath = basePath.get?.() ?? '';
  if (
    currentBasePath &&
    (titleHref === currentBasePath || titleHref.startsWith(`${currentBasePath}/`))
  ) {
    return titleHref;
  }
  if (titleHref.startsWith('/app/')) {
    return basePath.prepend(titleHref);
  }
  return titleHref;
};

export const AssetsAccordion = <TAsset extends AccordionAsset = AccordionAsset>({
  savedObjects,
  type,
  itemCount,
  initialIsOpen,
  header,
  titleExtra,
  getTitleHref,
}: AssetsAccordionProps<TAsset>) => {
  const { http } = useStartServices();
  const isDashboard = type === KibanaAssetType.dashboard;
  const count = itemCount ?? savedObjects.length;

  return (
    <EuiAccordion
      initialIsOpen={initialIsOpen ?? isDashboard}
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
              <h3>{count}</h3>
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={type}
    >
      <>
        <EuiSpacer size="m" />
        {header}
        <EuiSplitPanel.Outer
          hasBorder
          hasShadow={false}
          data-test-subj={`fleetAssetsAccordion.content.${type}`}
        >
          {savedObjects.map((asset, idx) => {
            const { id, attributes, appLink } = asset;
            const { title: soTitle, description } = attributes || {};
            if (type === 'view') {
              return;
            }

            const title = soTitle ?? id;
            const titleHref = getTitleHref ? getTitleHref(asset) : appLink;
            const extra = titleExtra?.(asset);
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
                          {titleHref ? (
                            <EuiLink href={resolveAssetTitleHref(titleHref, http.basePath)}>
                              {title}
                            </EuiLink>
                          ) : (
                            title
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    {extra && <EuiFlexItem grow={false}>{extra}</EuiFlexItem>}
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
