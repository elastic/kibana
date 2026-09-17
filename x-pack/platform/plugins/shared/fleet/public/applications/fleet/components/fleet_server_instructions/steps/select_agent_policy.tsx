/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useState } from 'react';

import { SO_SEARCH_LIMIT } from '../../../constants';
import {
  sendCreateEnrollmentAPIKey,
  sendGetEnrollmentAPIKeys,
  useStartServices,
} from '../../../hooks';
import type { EnrollmentAPIKey, EnrollmentSettingsFleetServerPolicy } from '../../../types';
import { isEnrollmentTokenExpired } from '../../../../../services';

import { SelectCreateAgentPolicy } from '../..';

const NoEnrollmentTokensCallout: React.FunctionComponent<{
  policyId: string;
  onTokenCreated: (key: EnrollmentAPIKey) => void;
}> = ({ policyId, onTokenCreated }) => {
  const { notifications } = useStartServices();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      const res = await sendCreateEnrollmentAPIKey({ policy_id: policyId });
      if (res.error) {
        throw res.error;
      }
      if (!res.data?.item) {
        return;
      }
      onTokenCreated(res.data.item);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.fleetServerSetup.enrollmentTokenCreatedToast', {
          defaultMessage: 'Enrollment token created',
        })
      );
    } catch (error) {
      notifications.toasts.addError(error, { title: 'Error' });
    } finally {
      setIsCreating(false);
    }
  }, [policyId, onTokenCreated, notifications.toasts]);

  return (
    <KbnWarningCallout
      title={i18n.translate('xpack.fleet.fleetServerSetup.noEnrollmentTokensCalloutTitle', {
        defaultMessage: 'There are no enrollment tokens for the selected Fleet Server policy',
      })}
      text={
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.noEnrollmentTokensCalloutDescription"
          defaultMessage="You must create an enrollment token in order to enroll a Fleet Server with this policy"
        />
      }
      actionProps={{
        primary: {
          iconType: 'plusCircle',
          isLoading: isCreating,
          onClick: handleCreate,
          children: (
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.createEnrollmentTokenButton"
              defaultMessage="Create enrollment token"
            />
          ),
        },
      }}
    />
  );
};

export const getSelectAgentPolicyStep = ({
  policyId,
  setPolicyId,
  eligibleFleetServerPolicies,
  refreshEligibleFleetServerPolicies,
}: {
  policyId?: string;
  setPolicyId: (v?: string) => void;
  eligibleFleetServerPolicies: EnrollmentSettingsFleetServerPolicy[];
  refreshEligibleFleetServerPolicies: () => void;
}): EuiStepProps => {
  return {
    title:
      eligibleFleetServerPolicies.length === 0 && !policyId
        ? i18n.translate('xpack.fleet.fleetServerSetup.stepCreateAgentPolicyTitle', {
            defaultMessage: 'Create a policy for Fleet Server',
          })
        : i18n.translate('xpack.fleet.fleetServerSetup.stepSelectAgentPolicyTitle', {
            defaultMessage: 'Select a policy for Fleet Server',
          }),
    status: policyId ? 'complete' : undefined,
    children: (
      <SelectAgentPolicyStepContent
        policyId={policyId}
        setPolicyId={setPolicyId}
        eligibleFleetServerPolicies={eligibleFleetServerPolicies}
        refreshEligibleFleetServerPolicies={refreshEligibleFleetServerPolicies}
      />
    ),
  };
};

const SelectAgentPolicyStepContent: React.FunctionComponent<{
  policyId?: string;
  setPolicyId: (v?: string) => void;
  eligibleFleetServerPolicies: EnrollmentSettingsFleetServerPolicy[];
  refreshEligibleFleetServerPolicies: () => void;
}> = ({
  policyId,
  setPolicyId,
  eligibleFleetServerPolicies,
  refreshEligibleFleetServerPolicies,
}) => {
  const { notifications } = useStartServices();

  useEffect(() => {
    // Select default value
    if (eligibleFleetServerPolicies.length === 1 && !policyId) {
      setPolicyId(eligibleFleetServerPolicies[0].id);
    }
  }, [eligibleFleetServerPolicies, policyId, setPolicyId]);

  const [enrollmentTokens, setEnrollmentTokens] = useState<EnrollmentAPIKey[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  useEffect(() => {
    if (!policyId) {
      setEnrollmentTokens([]);
      return;
    }

    const fetchTokens = async () => {
      setIsLoadingTokens(true);
      try {
        const res = await sendGetEnrollmentAPIKeys({ page: 1, perPage: SO_SEARCH_LIMIT });
        if (res.error) {
          throw res.error;
        }
        const activeTokens = (res.data?.items ?? []).filter(
          (k) => k.policy_id === policyId && k.active === true && !isEnrollmentTokenExpired(k)
        );
        setEnrollmentTokens(activeTokens);
      } catch (error) {
        notifications.toasts.addError(error, { title: 'Error' });
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokens();
  }, [policyId, notifications.toasts]);

  const onTokenCreated = useCallback((key: EnrollmentAPIKey) => {
    setEnrollmentTokens([key]);
  }, []);

  const setSelectedPolicyId = (agentPolicyId?: string) => {
    setPolicyId(agentPolicyId);
  };

  return (
    <>
      <SelectCreateAgentPolicy
        agentPolicies={eligibleFleetServerPolicies}
        withKeySelection={false}
        selectedPolicyId={policyId}
        setSelectedPolicyId={setSelectedPolicyId}
        refreshAgentPolicies={refreshEligibleFleetServerPolicies}
        excludeFleetServer={false}
        isFleetServerPolicy={true}
      />
      {policyId && !isLoadingTokens && enrollmentTokens.length === 0 && (
        <>
          <EuiSpacer size="m" />
          <NoEnrollmentTokensCallout policyId={policyId} onTokenCreated={onTokenCreated} />
        </>
      )}
    </>
  );
};
