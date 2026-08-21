/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';

import { EuiButton, EuiSpacer, EuiPageTemplate } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { usePolicyListContext } from './policy_list_context';
import { useIsReadOnly } from '../../lib/use_is_read_only';
import type { PolicyFromES } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { getPoliciesListPath, getPolicyCreatePath } from '../../services/navigation';
import { PolicyTable, ListActionHandler } from './components';
import { ViewPolicyFlyout } from './policy_flyout';

const createPolicyButtonLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.policyTable.emptyPrompt.createButtonLabel',
  { defaultMessage: 'Create policy' }
);

interface Props {
  policies: PolicyFromES[];
  updatePolicies: () => void;
}

export const PolicyList: React.FunctionComponent<Props> = ({ policies, updatePolicies }) => {
  const history = useHistory();
  const {
    services: { docLinks },
  } = useKibana();
  const isReadOnly = useIsReadOnly();
  const { setListAction } = usePolicyListContext();
  const [flyoutPolicy, setFlyoutPolicy] = useState<PolicyFromES | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const policyParam = decodeURIComponent(params.get('policy') ?? '');
    const policyFromParam = policies.find((policy) => policy.name === policyParam);
    if (policyFromParam) {
      setFlyoutPolicy(policyFromParam);
    } else {
      setFlyoutPolicy(null);
    }
  }, [history.location.search, policies, setListAction]);

  const createPolicyButton = (
    <EuiButton
      {...reactRouterNavigate(history, getPolicyCreatePath())}
      fill
      iconType="plusCircle"
      data-test-subj="createPolicyButton"
    >
      {createPolicyButtonLabel}
    </EuiButton>
  );

  if (policies.length === 0) {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.emptyPromptTitle"
              defaultMessage="Create your first index lifecycle policy"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.emptyPromptDescription"
                defaultMessage=" An index lifecycle policy helps you manage your indices as they age."
              />
            </p>
          </Fragment>
        }
        actions={createPolicyButton}
      />
    );
  }

  const menu: AppHeaderMenu | undefined = isReadOnly
    ? undefined
    : {
        primaryActionItem: {
          id: 'createPolicy',
          label: createPolicyButtonLabel,
          iconType: 'plusCircle',
          testId: 'createPolicyButton',
          run: () => history.push(getPolicyCreatePath()),
        },
      };

  return (
    <>
      <ListActionHandler
        deletePolicyCallback={() => {
          // if a flyout was open, then close it
          history.push(getPoliciesListPath());
          // update the policies in the list after 1 was deleted
          updatePolicies();
        }}
      />
      <AppHeader
        title={i18n.translate('xpack.indexLifecycleMgmt.policyTable.sectionHeading', {
          defaultMessage: 'Index Lifecycle Policies',
        })}
        description={i18n.translate('xpack.indexLifecycleMgmt.policyTable.sectionDescription', {
          defaultMessage:
            'Manage your indices as they age.  Attach a policy to automate when and how to transition an index through its lifecycle.',
        })}
        menu={menu}
        docLink={docLinks.links.elasticsearch.ilm}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      <PolicyTable policies={policies} />

      {flyoutPolicy && <ViewPolicyFlyout policy={flyoutPolicy} />}
    </>
  );
};
