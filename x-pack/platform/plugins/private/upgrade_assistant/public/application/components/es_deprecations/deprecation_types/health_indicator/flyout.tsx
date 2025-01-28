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
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';

import type {
  EnrichedDeprecationInfo,
  HealthIndicatorAction,
} from '../../../../../../common/types';
import { DeprecationFlyoutLearnMoreLink, DeprecationBadge } from '../../../shared';

export interface HealthIndicatorFlyoutProps {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

const i18nTexts = {
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.healthIndicatorFlyout.closeButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  healthIndicatorCauseHeader: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.healthIndicatorFlyout.healthIndicatorCauseHeader',
    { defaultMessage: 'Cause' }
  ),
  healthIndicatorActionHeader: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.healthIndicatorFlyout.healthIndicatorActionHeader',
    { defaultMessage: 'Action' }
  ),
  healthIndicatorImpactHeader: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.healthIndicatorFlyout.healthIndicatorImpactHeader',
    { defaultMessage: 'Impact' }
  ),
};

export const HealthIndicatorFlyout = ({ deprecation, closeFlyout }: HealthIndicatorFlyoutProps) => {
  const { message, url, details, correctiveAction } = deprecation;
  const { action, cause, impacts } = correctiveAction as HealthIndicatorAction;
  const showAction = Boolean(action && action !== '');
  const showLearnMore = Boolean(url && url !== '');

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge isCritical={deprecation.isCritical} isResolved={false} />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="defaultDeprecationDetailsFlyoutTitle">{message}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p className="eui-textBreakWord">{details}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText>
          <EuiTitle size="s" data-test-subj="flyoutTitle">
            <h3>{i18nTexts.healthIndicatorCauseHeader}</h3>
          </EuiTitle>
          <p className="eui-textBreakWord">{cause}</p>
        </EuiText>
        <EuiSpacer size="s" />
        {showAction && (
          <>
            <EuiText>
              <EuiTitle size="s" data-test-subj="flyoutTitle">
                <h3>{i18nTexts.healthIndicatorActionHeader}</h3>
              </EuiTitle>
              <p className="eui-textBreakWord">{action}</p>
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiText>
          <EuiTitle size="s" data-test-subj="flyoutTitle">
            <h3>{i18nTexts.healthIndicatorImpactHeader}</h3>
          </EuiTitle>
          <EuiCodeBlock language="json" isCopyable>
            {JSON.stringify(impacts, null, 2)}
          </EuiCodeBlock>
        </EuiText>
        <EuiSpacer size="s" />
        {showLearnMore && (
          <EuiText>
            <p>
              <DeprecationFlyoutLearnMoreLink documentationUrl={url} />
            </p>
          </EuiText>
        )}
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
