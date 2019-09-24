/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import {
  EuiEmptyPrompt,
  EuiButton,
  EuiCallOut,
  EuiPanel,
  EuiSpacer,
  EuiLoadingContent,
} from '@elastic/eui';
import { SlmPolicy } from '../../../../../common/types';
import { APP_SLM_CLUSTER_PRIVILEGES } from '../../../../../common/constants';
import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH, UIM_POLICY_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import {
  useLoadPolicies,
  useLoadPolicyStats,
  useLoadRetentionSettings,
} from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';
import { linkToAddPolicy, linkToPolicy } from '../../../services/navigation';
import { WithPrivileges, NotAuthorizedSection } from '../../../lib/authorization';

import { PolicyDetails } from './policy_details';
import { PolicyTable } from './policy_table';
import { PolicyStats } from './policy_stats';
import { PolicyRetentionSchedule } from './policy_retention_schedule';

interface MatchParams {
  policyName?: SlmPolicy['name'];
}

export const PolicyList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { policyName },
  },
  history,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    error,
    isLoading,
    data: { policies } = {
      policies: undefined,
    },
    sendRequest: reload,
  } = useLoadPolicies();

  // Load SLM policy statistics
  const { data: policyStats } = useLoadPolicyStats();

  // Load retention cluster settings
  const {
    isLoading: isLoadingRetentionSettings,
    data: retentionSettings,
    sendRequest: reloadRetentionSettings,
  } = useLoadRetentionSettings();

  const openPolicyDetailsUrl = (newPolicyName: SlmPolicy['name']): string => {
    return linkToPolicy(newPolicyName);
  };

  const closePolicyDetails = () => {
    history.push(`${BASE_PATH}/policies`);
  };

  const onPolicyDeleted = (policiesDeleted: Array<SlmPolicy['name']>): void => {
    if (policyName && policiesDeleted.includes(policyName)) {
      closePolicyDetails();
    }
    if (policiesDeleted.length) {
      reload();
    }
  };

  const onPolicyExecuted = () => {
    reload();
  };

  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_POLICY_LIST_LOAD);
  }, []);

  let content: JSX.Element;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.policyList.loadingPoliciesDescription"
          defaultMessage="Loading policies…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.policyList.LoadingPoliciesErrorMessage"
            defaultMessage="Error loading policies"
          />
        }
        error={error}
      />
    );
  } else if (policies && policies.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.policyList.emptyPromptTitle"
              defaultMessage="You don't have any snapshot policies yet"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.emptyPromptDescription"
                defaultMessage="Create a policy to automatically back up your cluster."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            href={linkToAddPolicy()}
            fill
            iconType="plusInCircle"
            data-test-subj="createPolicyButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.createPolicyButton"
              defaultMessage="Create a policy"
            />
          </EuiButton>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    const policySchedules = policies.map((policy: SlmPolicy) => policy.schedule);
    const hasDuplicateSchedules = policySchedules.length > new Set(policySchedules).size;
    content = (
      <Fragment>
        {hasDuplicateSchedules ? (
          <Fragment>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.policyScheduleWarningTitle"
                  defaultMessage="Two or more policies have the same schedule"
                />
              }
              color="warning"
              iconType="alert"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.policyScheduleWarningDescription"
                defaultMessage="Only one snapshot can be taken at a time. To avoid snapshot failures, edit or delete the policies."
              />
            </EuiCallOut>
            <EuiSpacer />
          </Fragment>
        ) : null}

        {isLoadingRetentionSettings ? (
          <EuiPanel>
            <EuiLoadingContent lines={1} />;
          </EuiPanel>
        ) : null}

        {retentionSettings ? (
          <PolicyRetentionSchedule
            retentionSettings={retentionSettings}
            onRetentionScheduleUpdated={reloadRetentionSettings}
          />
        ) : null}

        <EuiSpacer />

        {policyStats ? <PolicyStats stats={policyStats} /> : null}

        <PolicyTable
          policies={policies || []}
          reload={reload}
          openPolicyDetailsUrl={openPolicyDetailsUrl}
          onPolicyDeleted={onPolicyDeleted}
          onPolicyExecuted={onPolicyExecuted}
        />
      </Fragment>
    );
  }

  return (
    <WithPrivileges privileges={APP_SLM_CLUSTER_PRIVILEGES.map(name => `cluster.${name}`)}>
      {({ hasPrivileges, privilegesMissing }) =>
        hasPrivileges ? (
          <section data-test-subj="policyList">
            {policyName ? (
              <PolicyDetails
                policyName={policyName}
                onClose={closePolicyDetails}
                onPolicyDeleted={onPolicyDeleted}
                onPolicyExecuted={onPolicyExecuted}
              />
            ) : null}
            {content}
          </section>
        ) : (
          <NotAuthorizedSection
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.deniedPrivilegeTitle"
                defaultMessage="You're missing cluster privileges"
              />
            }
            message={
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.deniedPrivilegeDescription"
                defaultMessage="To manage Snapshot Lifecycle Policies, you must have {privilegesCount,
                  plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                values={{
                  missingPrivileges: privilegesMissing.cluster!.join(', '),
                  privilegesCount: privilegesMissing.cluster!.length,
                }}
              />
            }
          />
        )
      }
    </WithPrivileges>
  );
};
