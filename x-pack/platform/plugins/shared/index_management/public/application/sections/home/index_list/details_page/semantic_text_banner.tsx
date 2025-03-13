/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { documentationService } from '../../../../services';

interface SemanticTextBannerProps {
  isSemanticTextEnabled: boolean;
  isPlatinumLicense?: boolean;
}

const defaultLicenseMessage = (
  <FormattedMessage
    id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.descriptionForPlatinumLicense"
    defaultMessage="{label} Upgrade your license to add semantic_text field types to your indices.'"
    values={{
      label: (
        <strong>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.semanticTextFieldAvailableForPlatinumLicense"
            defaultMessage="Semantic text now available for platinum license."
          />
        </strong>
      ),
    }}
  />
);

const getPlatinumLicenseMessage = () => (
  <FormattedMessage
    id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.description"
    defaultMessage="{label} Add a field to your mapping and choose 'Semantic text' to get started. Documents will be automatically chunked to fit model context limits, to avoid truncation. {learnMore}"
    values={{
      label: (
        <strong>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.semanticTextFieldAvailable"
            defaultMessage="semantic_text field type now available!"
          />
        </strong>
      ),
      learnMore: (
        <EuiLink href={documentationService.getConfigureChunkingDocLink()} target="_blank">
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.learnMore"
            defaultMessage="Learn more"
          />
        </EuiLink>
      ),
    }}
  />
);

export function SemanticTextBanner({
  isSemanticTextEnabled,
  isPlatinumLicense = false,
}: SemanticTextBannerProps) {
  const [isSemanticTextBannerDisplayable, setIsSemanticTextBannerDisplayable] =
    useLocalStorage<boolean>('semantic-text-banner-display', true);

  return isSemanticTextBannerDisplayable && isSemanticTextEnabled ? (
    <>
      <EuiPanel color="accentSecondary" data-test-subj="indexDetailsMappingsSemanticTextBanner">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiText size="m" color="primary">
              {isPlatinumLicense ? getPlatinumLicenseMessage() : defaultLicenseMessage}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={() => setIsSemanticTextBannerDisplayable(false)}
              data-test-subj="SemanticTextBannerDismissButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.dismiss"
                defaultMessage="Dismiss"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  ) : null;
}
