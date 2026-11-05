/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import type { CoreServiceAccountsService } from '@kbn/core-security-browser';
import type {
  ServiceAccountBoundWorkload,
  ServiceAccountRoleReference,
} from '@kbn/core-security-common';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { BoundWorkloadsTable } from './bound_workloads_table';
import type { ServiceAccountRoleUsage } from './use_service_account_role_usage';

/** Accounts listed per role before the rest are folded behind a button. */
const INITIAL_VISIBLE_ACCOUNTS = 5;

type WorkloadsLister = Pick<CoreServiceAccountsService, 'listWorkloads'>;

export interface ServiceAccountRoleUsageCalloutProps {
  usage: ServiceAccountRoleUsage;
  /** Loads an account's workloads when its row is first expanded. */
  serviceAccounts: WorkloadsLister;
  /** How many roles are being changed. Only used for wording. */
  roleCount: number;
  /** What is about to happen to the roles. */
  action: 'update' | 'delete';
}

const AccountName = ({ account }: { account: ServiceAccountRoleReference }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{account.name}</strong>
      </EuiText>
    </EuiFlexItem>
    {!account.enabled && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="default" data-test-subj="serviceAccountRoleUsageDisabledBadge">
          {i18n.translate('xpack.security.serviceAccountRoleUsage.disabledBadge', {
            defaultMessage: 'Disabled',
          })}
        </EuiBadge>
      </EuiFlexItem>
    )}
    {account.workloadCount !== undefined && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" data-test-subj="serviceAccountRoleUsageWorkloadCount">
          {i18n.translate('xpack.security.serviceAccountRoleUsage.workloadCount', {
            defaultMessage: '{count, plural, one {# workload} other {# workloads}}',
            values: { count: account.workloadCount },
          })}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

/** Loads the account's workloads the first time it is expanded. */
const AccountWorkloads = ({
  account,
  serviceAccounts,
}: {
  account: ServiceAccountRoleReference;
  serviceAccounts: WorkloadsLister;
}) => {
  const [workloads, setWorkloads] = useState<ServiceAccountBoundWorkload[] | 'error'>();

  useEffect(() => {
    let isCurrent = true;
    serviceAccounts.listWorkloads(account.id).then(
      (result) => {
        if (isCurrent) setWorkloads(result);
      },
      () => {
        if (isCurrent) setWorkloads('error');
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [account.id, serviceAccounts]);

  if (workloads === undefined) {
    return (
      <EuiLoadingSpinner
        size="m"
        aria-label={i18n.translate('xpack.security.serviceAccountRoleUsage.workloadsLoading', {
          defaultMessage: 'Loading bound workloads',
        })}
        data-test-subj="serviceAccountRoleUsageWorkloadsLoading"
      />
    );
  }

  if (workloads === 'error') {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="serviceAccountRoleUsageWorkloadsError">
        {i18n.translate('xpack.security.serviceAccountRoleUsage.workloadsError', {
          defaultMessage: 'Unable to load the workloads bound to this account.',
        })}
      </EuiText>
    );
  }

  return <BoundWorkloadsTable workloads={workloads} />;
};

const AccountRow = ({
  account,
  serviceAccounts,
}: {
  account: ServiceAccountRoleReference;
  serviceAccounts: WorkloadsLister;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'serviceAccountRoleUsage' });
  const [hasOpened, setHasOpened] = useState(false);

  // Nothing to expand into when the account is known to have no workloads.
  if (account.workloadCount === 0) {
    return (
      <div data-test-subj="serviceAccountRoleUsageAccount">
        <AccountName account={account} />
      </div>
    );
  }

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={<AccountName account={account} />}
      onToggle={(isOpen) => {
        if (isOpen) setHasOpened(true);
      }}
      paddingSize="s"
      data-test-subj="serviceAccountRoleUsageAccount"
    >
      {hasOpened && <AccountWorkloads account={account} serviceAccounts={serviceAccounts} />}
    </EuiAccordion>
  );
};

const AccountList = ({
  accounts,
  serviceAccounts,
}: {
  accounts: ServiceAccountRoleReference[];
  serviceAccounts: WorkloadsLister;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? accounts : accounts.slice(0, INITIAL_VISIBLE_ACCOUNTS);

  return (
    <>
      {visible.map((account) => (
        <AccountRow key={account.id} account={account} serviceAccounts={serviceAccounts} />
      ))}
      {visible.length < accounts.length && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setShowAll(true)}
          data-test-subj="serviceAccountRoleUsageShowAll"
        >
          {i18n.translate('xpack.security.serviceAccountRoleUsage.showAll', {
            defaultMessage: 'Show all {count} service accounts',
            values: { count: accounts.length },
          })}
        </EuiButtonEmpty>
      )}
    </>
  );
};

/** Groups accounts under each role they hold, when more than one role is involved. */
const groupByRole = (accounts: ServiceAccountRoleReference[]) => {
  const groups = new Map<string, ServiceAccountRoleReference[]>();
  for (const account of accounts) {
    for (const role of account.roles) {
      groups.set(role, [...(groups.get(role) ?? []), account]);
    }
  }
  return [...groups.entries()].sort(([first], [second]) => first.localeCompare(second));
};

const Note = ({ children, testSubj }: { children: React.ReactNode; testSubj: string }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} data-test-subj={testSubj}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="info" size="s" color="subdued" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="xs" color="subdued">
        {children}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/** Whether {@link ServiceAccountRoleUsageCallout} renders anything for `usage`. */
export const hasServiceAccountRoleUsageCallout = (usage: ServiceAccountRoleUsage): boolean =>
  usage.status !== 'hidden' &&
  !(usage.status === 'loaded' && usage.complete && usage.serviceAccounts.length === 0);

/**
 * Warns that the roles about to change are held by service accounts, and so by the workloads that
 * run as them. Renders nothing when there is nothing to warn about, and a quiet note when the
 * lookup failed or could not check every account.
 */
export const ServiceAccountRoleUsageCallout = ({
  usage,
  serviceAccounts,
  roleCount,
  action,
}: ServiceAccountRoleUsageCalloutProps) => {
  if (!hasServiceAccountRoleUsageCallout(usage) || usage.status === 'hidden') {
    return null;
  }

  if (usage.status === 'loading') {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        data-test-subj="serviceAccountRoleUsageLoading"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.security.serviceAccountRoleUsage.loading', {
              defaultMessage:
                'Checking which service accounts use {roleCount, plural, one {this role} other {these roles}}…',
              values: { roleCount },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (usage.status === 'error') {
    return (
      <Note testSubj="serviceAccountRoleUsageError">
        {i18n.translate('xpack.security.serviceAccountRoleUsage.error', {
          defaultMessage:
            "Couldn't check which service accounts use {roleCount, plural, one {this role} other {these roles}}.",
          values: { roleCount },
        })}
      </Note>
    );
  }

  const { serviceAccounts: accounts, complete } = usage;
  const incompleteNote = complete ? null : (
    <Note testSubj="serviceAccountRoleUsageIncomplete">
      {i18n.translate('xpack.security.serviceAccountRoleUsage.incomplete', {
        defaultMessage:
          "Couldn't check every service account, so more may use {roleCount, plural, one {this role} other {these roles}}.",
        values: { roleCount },
      })}
    </Note>
  );

  if (accounts.length === 0) {
    return incompleteNote;
  }

  const groups = groupByRole(accounts);

  return (
    <KbnWarningCallout
      announceOnMount={false}
      size="s"
      title={i18n.translate('xpack.security.serviceAccountRoleUsage.title', {
        defaultMessage:
          '{count, plural, one {# service account uses} other {# service accounts use}} {roleCount, plural, one {this role} other {these roles}}',
        values: { count: accounts.length, roleCount },
      })}
      text={
        action === 'delete'
          ? i18n.translate('xpack.security.serviceAccountRoleUsage.deleteDescription', {
              defaultMessage:
                'Deleting {roleCount, plural, one {this role} other {these roles}} immediately removes the privileges {roleCount, plural, one {it grants} other {they grant}} from these accounts and from the workloads that run as them.',
              values: { roleCount },
            })
          : i18n.translate('xpack.security.serviceAccountRoleUsage.updateDescription', {
              defaultMessage:
                'Changes take effect immediately for these accounts and for the workloads that run as them.',
            })
      }
      data-test-subj="serviceAccountRoleUsageCallout"
    >
      {groups.length > 1 ? (
        groups.map(([role, roleAccounts]) => (
          <div key={role} data-test-subj="serviceAccountRoleUsageGroup">
            <EuiTitle size="xxxs">
              <h4>{role}</h4>
            </EuiTitle>
            <AccountList accounts={roleAccounts} serviceAccounts={serviceAccounts} />
            <EuiSpacer size="s" />
          </div>
        ))
      ) : (
        <AccountList accounts={accounts} serviceAccounts={serviceAccounts} />
      )}
      {incompleteNote}
    </KbnWarningCallout>
  );
};

/**
 * A compact warning for under a save button, shown when service accounts hold the role being
 * saved. Renders nothing otherwise.
 */
export const ServiceAccountRoleUsageSaveHint = ({ usage }: { usage: ServiceAccountRoleUsage }) => {
  if (usage.status !== 'loaded' || usage.serviceAccounts.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        data-test-subj="serviceAccountRoleUsageSaveHint"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="warning" color="warning" size="s" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="warning">
            {i18n.translate('xpack.security.serviceAccountRoleUsage.saveHint', {
              defaultMessage:
                'Saving affects {count, plural, one {# service account} other {# service accounts}}',
              values: { count: usage.serviceAccounts.length },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
