/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout, type KbnCalloutProps } from '@kbn/ui-callout';

export interface FrozenEnterpriseRequiredCalloutProps {
  onUpgradeEnterprise?: () => void;
  calloutTestSubj?: string;
  upgradeButtonTestSubj?: string;
  calloutCss?: KbnCalloutProps['css'];
}

export const FrozenEnterpriseRequiredCallout = ({
  onUpgradeEnterprise,
  calloutTestSubj,
  upgradeButtonTestSubj,
  calloutCss,
}: FrozenEnterpriseRequiredCalloutProps) => {
  return (
    <KbnWarningCallout
      size="s"
      announceOnMount={false}
      title={i18n.translate('xpack.dataLifecyclePhases.frozen.enterpriseRequiredCallout.title', {
        defaultMessage: 'Enterprise license required for frozen phase',
      })}
      text={i18n.translate('xpack.dataLifecyclePhases.frozen.enterpriseRequiredCallout.body', {
        defaultMessage:
          'Your current subscription tier does not support the frozen phase. This phase will be ignored until you remove it or upgrade your license.',
      })}
      actionProps={
        onUpgradeEnterprise
          ? {
              primary: {
                onClick: onUpgradeEnterprise,
                children: i18n.translate(
                  'xpack.dataLifecyclePhases.frozen.enterpriseRequiredCallout.upgradeButton',
                  {
                    defaultMessage: 'Upgrade to enterprise',
                  }
                ),
                'data-test-subj': upgradeButtonTestSubj,
              },
            }
          : undefined
      }
      data-test-subj={calloutTestSubj}
      css={calloutCss}
    />
  );
};
