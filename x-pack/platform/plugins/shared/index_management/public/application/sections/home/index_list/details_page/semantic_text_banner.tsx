/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useAppContext } from '../../../../app_context';

const LICENSE_MANAGEMENT_LOCATOR_ID = 'LICENSE_MANAGEMENT_LOCATOR';

export const SemanticTextBanner = () => {
  const {
    core: { application },
    plugins: { share },
  } = useAppContext();
  const [isSemanticTextBannerDisplayable, setIsSemanticTextBannerDisplayable] =
    useLocalStorage<boolean>('semantic-text-banner-display', true);

  const licenseManagementLocator = share.url.locators.get(LICENSE_MANAGEMENT_LOCATOR_ID);
  const canManageLicense = Boolean(
    application?.capabilities?.management?.stack?.license_management
  );

  const bannerTitle = i18n.translate(
    'xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.title',
    {
      defaultMessage: 'The semantic_text field type is available with a Platinum license',
    }
  );

  const bannerText = i18n.translate('xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.text', {
    defaultMessage: 'Upgrade to use the semantic_text type in your indices.',
  });

  const manageLicenseLabel = i18n.translate(
    'xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.manageLicenseLabel',
    {
      defaultMessage: 'Manage license',
    }
  );

  return isSemanticTextBannerDisplayable ? (
    <KbnInfoCallout
      title={bannerTitle}
      size="s"
      text={bannerText}
      announceOnMount={false}
      data-test-subj="indexDetailsMappingsSemanticTextBanner"
      onDismiss={() => setIsSemanticTextBannerDisplayable(false)}
      actionProps={
        canManageLicense && licenseManagementLocator
          ? {
              primary: {
                children: manageLicenseLabel,
                onClick: () => licenseManagementLocator.navigate({ page: 'dashboard' }),
                'data-test-subj': 'SemanticTextBannerManageLicenseButton',
              },
            }
          : undefined
      }
    />
  ) : null;
};
