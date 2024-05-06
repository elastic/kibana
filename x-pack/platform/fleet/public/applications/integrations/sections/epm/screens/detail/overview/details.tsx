/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiDescriptionList,
  EuiNotificationBadge,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';

import { withSuspense, LazyReplacementCard } from '@kbn/custom-integrations-plugin/public';
import { uniq } from 'lodash';

import type {
  PackageInfo,
  PackageSpecCategory,
  AssetTypeToParts,
  KibanaAssetType,
  RegistryPolicyTemplate,
  RegistryPolicyIntegrationTemplate,
} from '../../../../../types';
import { entries } from '../../../../../types';
import { useGetCategoriesQuery } from '../../../../../hooks';
import { AssetTitleMap, DisplayedAssets, ServiceTitleMap } from '../../../constants';

import { ChangelogModal } from '../settings/changelog_modal';

import { NoticeModal } from './notice_modal';
import { LicenseModal } from './license_modal';

const ReplacementCard = withSuspense(LazyReplacementCard);

interface Props {
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
}

const Replacements = euiStyled(EuiFlexItem)`
  margin: 0;

  & .euiAccordion {
    padding-top: ${({ theme }) => parseInt(theme.eui.euiSizeL, 10) * 2}px;

    &::before {
      content: '';
      display: block;
      border-top: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
      position: relative;
      top: -${({ theme }) => theme.eui.euiSizeL};
      margin: 0 ${({ theme }) => theme.eui.euiSizeXS};
    }
  }
`;

export const Details: React.FC<Props> = memo(({ packageInfo, integrationInfo }) => {
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetCategoriesQuery();

  const mergedCategories: Array<string | undefined> = useMemo(() => {
    let allCategories: Array<string | undefined> = [];

    if (packageInfo?.categories) {
      allCategories = packageInfo.categories;
    }
    if ((integrationInfo as RegistryPolicyIntegrationTemplate)?.categories) {
      allCategories = uniq([
        ...allCategories,
        ...((integrationInfo as RegistryPolicyIntegrationTemplate)?.categories || []),
      ]);
    }
    return allCategories;
  }, [integrationInfo, packageInfo?.categories]);

  const packageCategories: string[] = useMemo(() => {
    if (!isLoadingCategories && categoriesData?.items) {
      return categoriesData.items
        .filter((category) => mergedCategories?.includes(category.id as PackageSpecCategory))
        .map((category) => category.title);
    }
    return [];
  }, [categoriesData, isLoadingCategories, mergedCategories]);

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const toggleNoticeModal = useCallback(() => {
    setIsNoticeModalOpen((currentState) => !currentState);
  }, []);

  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const toggleLicenseModal = useCallback(() => {
    setIsLicenseModalOpen((currentState) => !currentState);
  }, []);

  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const toggleChangelogModal = useCallback(() => {
    setIsChangelogModalOpen((currentState) => !currentState);
  }, []);

  const listItems = useMemo(() => {
    // Base details: version and categories
    const items: EuiDescriptionListProps['listItems'] = [
      {
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.versionLabel" defaultMessage="Version" />
          </EuiTextColor>
        ),
        description: packageInfo.version,
      },
      {
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.categoryLabel" defaultMessage="Category" />
          </EuiTextColor>
        ),
        description: packageCategories.join(', '),
      },
    ];

    // Asset details and counts
    entries(packageInfo.assets).forEach(([service, typeToParts]) => {
      // Filter out assets we are not going to display
      // (currently we only display Kibana and Elasticsearch assets)
      const filteredTypes: AssetTypeToParts = entries(typeToParts).reduce(
        (acc: any, [asset, value]) => {
          if (DisplayedAssets[service].includes(asset)) acc[asset] = value;
          return acc;
        },
        {}
      );
      if (Object.entries(filteredTypes).length) {
        items.push({
          title: (
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.fleet.epm.assetGroupTitle"
                defaultMessage="{assetType} assets"
                values={{
                  assetType: ServiceTitleMap[service],
                }}
              />
            </EuiTextColor>
          ),
          description: (
            <EuiFlexGroup direction="column" gutterSize="xs">
              {entries(filteredTypes).map(([_type, parts], index) => {
                const type = _type as KibanaAssetType;
                return (
                  <EuiFlexItem key={`item-${index}`}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>{AssetTitleMap[type]}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiNotificationBadge color="subdued">{parts.length}</EuiNotificationBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          ),
        });
      }
    });

    // Feature (data stream type) details
    const dataStreamTypes = [
      ...new Set(packageInfo.data_streams?.map((dataStream) => dataStream.type) || []),
    ];
    if (dataStreamTypes.length) {
      items.push({
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.featuresLabel" defaultMessage="Features" />
          </EuiTextColor>
        ),
        description: dataStreamTypes.join(', '),
      });
    }

    // Subscription details
    items.push({
      title: (
        <EuiTextColor color="subdued">
          <FormattedMessage id="xpack.fleet.epm.subscriptionLabel" defaultMessage="Subscription" />
        </EuiTextColor>
      ),
      description: (
        <p>{packageInfo.conditions?.elastic?.subscription || packageInfo.license || '-'}</p>
      ),
    });

    let ownerTypeDescription: React.ReactNode;
    switch (packageInfo.owner.type) {
      case 'community':
        ownerTypeDescription = (
          <FormattedMessage
            id="xpack.fleet.epm.ownerTypeCommunityDescription"
            defaultMessage="Community"
          />
        );
        break;
      case 'partner':
        ownerTypeDescription = (
          <FormattedMessage
            id="xpack.fleet.epm.ownerTypePartnerDescription"
            defaultMessage="Partner"
          />
        );
        break;
      case 'elastic':
        ownerTypeDescription = (
          <FormattedMessage
            id="xpack.fleet.epm.ownerTypeElasticDescription"
            defaultMessage="Elastic"
          />
        );
        break;
    }

    if (ownerTypeDescription) {
      items.push({
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.ownerTypeLabel" defaultMessage="Developed by" />
          </EuiTextColor>
        ),
        description: ownerTypeDescription,
      });
    }

    // License details
    if (packageInfo.licensePath || packageInfo.source?.license || packageInfo.notice) {
      items.push({
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.licenseLabel" defaultMessage="License" />
          </EuiTextColor>
        ),
        description: (
          <>
            {packageInfo.licensePath ? (
              <p>
                <EuiLink onClick={toggleLicenseModal}>
                  {packageInfo.source?.license || 'LICENSE.txt'}
                </EuiLink>
              </p>
            ) : (
              <p>{packageInfo.source?.license || '-'}</p>
            )}
            {packageInfo.notice && (
              <p>
                <EuiLink onClick={toggleNoticeModal}>NOTICE.txt</EuiLink>
              </p>
            )}
          </>
        ),
      });
    }

    items.push({
      title: (
        <EuiTextColor color="subdued">
          <FormattedMessage id="xpack.fleet.epm.changelogLabel" defaultMessage="Changelog" />
        </EuiTextColor>
      ),
      description: (
        <>
          <p>
            <EuiLink onClick={toggleChangelogModal}>View Changelog</EuiLink>
          </p>
        </>
      ),
    });

    return items;
  }, [
    packageCategories,
    packageInfo.assets,
    packageInfo.conditions?.elastic?.subscription,
    packageInfo.data_streams,
    packageInfo.license,
    packageInfo.licensePath,
    packageInfo.notice,
    packageInfo.source?.license,
    packageInfo.owner.type,
    packageInfo.version,
    toggleLicenseModal,
    toggleNoticeModal,
    toggleChangelogModal,
  ]);

  return (
    <>
      <EuiPortal>
        {isNoticeModalOpen && packageInfo.notice && (
          <NoticeModal noticePath={packageInfo.notice} onClose={toggleNoticeModal} />
        )}
      </EuiPortal>
      <EuiPortal>
        {isLicenseModalOpen && packageInfo.licensePath && (
          <LicenseModal
            licenseName={packageInfo.source?.license}
            licensePath={packageInfo.licensePath}
            onClose={toggleLicenseModal}
          />
        )}
      </EuiPortal>
      <EuiPortal>
        {isChangelogModalOpen && (
          <ChangelogModal
            latestVersion={packageInfo.version}
            packageName={packageInfo.name}
            onClose={toggleChangelogModal}
          />
        )}
      </EuiPortal>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h4>
              <FormattedMessage id="xpack.fleet.epm.detailsTitle" defaultMessage="Details" />
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList type="column" compressed listItems={listItems} />
        </EuiFlexItem>
        <Replacements>
          <ReplacementCard eprPackageName={packageInfo.name} />
        </Replacements>
      </EuiFlexGroup>
    </>
  );
});
