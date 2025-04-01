/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';

import { EnrichedDeprecationInfo } from '../../../../../../common/types';
import { DeprecationFlyoutLearnMoreLink, DeprecationBadge } from '../../../shared';
import { DEPRECATION_TYPE_MAP } from '../../../constants';

export interface DefaultDeprecationFlyoutProps {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

const i18nTexts = {
  getFlyoutDescription: (indexName: string) =>
    i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.deprecationDetailsFlyout.secondaryDescription',
      {
        defaultMessage: 'Index: {indexName}',
        values: {
          indexName,
        },
      }
    ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.deprecationDetailsFlyout.closeButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
};

export const DefaultDeprecationFlyout = ({
  deprecation,
  closeFlyout,
}: DefaultDeprecationFlyoutProps) => {
  const { message, url, details, index } = deprecation;

  const typeName = DEPRECATION_TYPE_MAP[deprecation.type];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge isCritical={deprecation.isCritical} isResolved={false} />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="defaultDeprecationDetailsFlyoutTitle">{message}</h2>
        </EuiTitle>
        {index && (
          <EuiText data-test-subj="flyoutDescription">
            <p>
              <EuiTextColor color="subdued">
                {typeName ? `${typeName}: ${index!}` : i18nTexts.getFlyoutDescription(index!)}
              </EuiTextColor>
            </p>
          </EuiText>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p className="eui-textBreakWord">{details}</p>
          {url && (
            <p>
              <DeprecationFlyoutLearnMoreLink documentationUrl={url} />
            </p>
          )}
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
