/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCheckbox, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const IncompatibleAgentVersionCallout: React.FC<{
  incompatibility: 'SOME' | 'ALL';
  versionCondition?: string;
  blockedCount?: number;
  observedVersions?: string[];
  minVersion?: string;
  /** Number of selected agent policies, used to word the warning. */
  agentPolicyCount?: number;
  /** When set, the callout asks the user to acknowledge the incompatibility before saving. */
  onAcknowledgeChange?: (acknowledged: boolean) => void;
  acknowledged?: boolean;
}> = ({
  incompatibility,
  versionCondition,
  blockedCount,
  observedVersions,
  minVersion,
  agentPolicyCount = 1,
  onAcknowledgeChange,
  acknowledged = false,
}) => {
  const checkboxId = useGeneratedHtmlId({ prefix: 'acknowledgeAgentVersionIncompatibility' });

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        data-test-subj="incompatibleAgentVersionCallout"
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.incompatibleAgentVersionTitle"
            defaultMessage="Incompatible agent version"
          />
        }
        text={
          <>
            {incompatibility === 'SOME' ? (
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.StepSelectPolicy.someIncompatibleAgentVersionWarning"
                defaultMessage="Some agents using the selected {agentPolicyCount, plural, one {agent policy} other {agent policies}} are running on a version that is not compatible with this integration. This integration requires agents on version {versionCondition}."
                values={{ versionCondition, agentPolicyCount }}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.StepSelectPolicy.allIncompatibleAgentVersionWarning"
                defaultMessage="None of the agents using the selected {agentPolicyCount, plural, one {agent policy} other {agent policies}} are compatible with this integration. This integration requires agents on version {versionCondition}."
                values={{ versionCondition, agentPolicyCount }}
              />
            )}{' '}
            {blockedCount !== undefined && observedVersions?.length ? (
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.StepSelectPolicy.incompatibleAgentVersionImpact"
                defaultMessage="{blockedCount, plural, one {# active agent} other {# active agents}} on {observedVersions} would stop collecting this integration's data."
                values={{
                  blockedCount,
                  observedVersions: i18n.formatList('conjunction', observedVersions),
                }}
              />
            ) : null}{' '}
            {minVersion ? (
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.StepSelectPolicy.incompatibleAgentVersionUpgrade"
                defaultMessage="Upgrade them to {minVersion} or later first."
                values={{ minVersion }}
              />
            ) : null}
          </>
        }
      >
        {onAcknowledgeChange ? (
          <EuiCheckbox
            id={checkboxId}
            data-test-subj="acknowledgeAgentVersionIncompatibilityCheckbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
            label={
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.StepSelectPolicy.acknowledgeAgentVersionIncompatibility"
                defaultMessage="I understand that these agents won't collect this integration's data until they are upgraded"
              />
            }
          />
        ) : null}
      </KbnWarningCallout>

      <EuiSpacer size="m" />
    </>
  );
};
