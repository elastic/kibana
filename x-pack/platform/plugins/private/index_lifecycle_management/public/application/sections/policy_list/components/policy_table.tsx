/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiLink,
  EuiInMemoryTable,
  EuiToolTip,
  EuiFlexItem,
  EuiSwitch,
  EuiSearchBarProps,
  EuiInMemoryTableProps,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import moment from 'moment';
import { METRIC_TYPE } from '@kbn/analytics';
import { useHistory } from 'react-router-dom';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import { hasLinkedIndices } from '../../../lib/policies';
import { useStateWithLocalStorage } from '../../../lib/settings_local_storage';
import { PolicyFromES } from '../../../../../common/types';
import { useKibana } from '../../../../shared_imports';
import {
  getIndicesListPath,
  getPolicyEditPath,
  getPolicyViewPath,
} from '../../../services/navigation';
import { trackUiMetric } from '../../../services/ui_metric';
import { UIM_VIEW_CLICK } from '../../../constants';

import { usePolicyListContext } from '../policy_list_context';
import { ManagedPolicyBadge, DeprecatedPolicyBadge } from '.';
import { useIsReadOnly } from '../../../lib/use_is_read_only';

const actionTooltips = {
  viewIndices: i18n.translate('xpack.indexLifecycleMgmt.policyTable.viewIndicesButtonText', {
    defaultMessage: 'View indices linked to policy',
  }),
  viewIndexTemplates: i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.viewIndexTemplatesButtonText',
    {
      defaultMessage: 'View index templates linked to policy',
    }
  ),
};

interface Props {
  policies: PolicyFromES[];
}

const SHOW_MANAGED_POLICIES_BY_DEFAULT = 'ILM_SHOW_MANAGED_POLICIES_BY_DEFAULT';
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const PolicyTable: React.FunctionComponent<Props> = ({ policies }) => {
  const [query, setQuery] = useState('');
  const isReadOnly = useIsReadOnly();
  const history = useHistory();
  const {
    services: { getUrlForApp },
  } = useKibana();
  const [managedPoliciesVisible, setManagedPoliciesVisible] = useStateWithLocalStorage<boolean>(
    SHOW_MANAGED_POLICIES_BY_DEFAULT,
    false
  );
  const { setListAction } = usePolicyListContext();

  const { pageSize, sorting, onTableChange } = useEuiTablePersist<PolicyFromES>({
    tableId: 'ilmPolicies',
    initialPageSize: 25,
    initialSort: {
      field: 'name',
      direction: 'asc',
    },
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  const handleOnChange: EuiSearchBarProps['onChange'] = ({ queryText, error }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  const searchOptions = useMemo(
    () => ({
      query,
      onChange: handleOnChange,
      box: { incremental: true, 'data-test-subj': 'ilmSearchBar' },
      filters: [
        {
          type: 'is',
          field: 'policy.deprecated',
          name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.isDeprecatedFilterLabel', {
            defaultMessage: 'Deprecated',
          }),
        },
      ],
      toolsRight: (
        <EuiFlexItem grow={false}>
          <EuiSwitch
            id="checkboxShowHiddenIndices"
            data-test-subj="includeHiddenPoliciesSwitch"
            checked={managedPoliciesVisible}
            onChange={(event) => setManagedPoliciesVisible(event.target.checked)}
            label={
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.hiddenPoliciesSwitchLabel"
                defaultMessage="Include managed system policies"
              />
            }
          />
        </EuiFlexItem>
      ),
    }),
    [managedPoliciesVisible, setManagedPoliciesVisible, query]
  );

  const filteredPolicies = useMemo(() => {
    let result = managedPoliciesVisible
      ? policies
      : policies.filter((item) => !item.policy?._meta?.managed);

    // When the query includes 'is:policy.deprecated', we want to show deprecated policies.
    // Otherwise hide them all since they wont be supported in the future.
    if (query.includes('is:policy.deprecated')) {
      result = result.filter((item) => item.policy?.deprecated);
    } else {
      result = result.filter((item) => !item.policy?.deprecated);
    }

    return result;
  }, [policies, managedPoliciesVisible, query]);

  const columns: Array<EuiBasicTableColumn<PolicyFromES>> = [
    {
      'data-test-subj': 'policy-name',
      field: 'name',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (value: string, item) => {
        const isManaged = item.policy?._meta?.managed;
        const isDeprecated = item.policy?.deprecated;

        return (
          <>
            <EuiLink
              className="eui-textBreakAll"
              data-test-subj="policyTablePolicyNameLink"
              {...reactRouterNavigate(history, getPolicyViewPath(value), () =>
                trackUiMetric(METRIC_TYPE.CLICK, UIM_VIEW_CLICK)
              )}
            >
              {value}
            </EuiLink>

            {isDeprecated && (
              <>
                &nbsp;
                <DeprecatedPolicyBadge />
              </>
            )}

            {isManaged && (
              <>
                &nbsp;
                <ManagedPolicyBadge />
              </>
            )}
          </>
        );
      },
    },
    {
      'data-test-subj': 'policy-indexTemplates',
      field: 'indexTemplates',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.indexTemplatesHeader', {
        defaultMessage: 'Linked index templates',
      }),
      sortable: ({ indexTemplates }) => (indexTemplates ?? []).length,
      render: (value: string[], policy: PolicyFromES) => {
        return value && value.length > 0 ? (
          <EuiToolTip content={actionTooltips.viewIndexTemplates} position="left">
            <EuiButtonEmpty
              flush="both"
              data-test-subj="viewIndexTemplates"
              onClick={() =>
                setListAction({ selectedPolicy: policy, actionType: 'viewIndexTemplates' })
              }
            >
              {value.length}
            </EuiButtonEmpty>
          </EuiToolTip>
        ) : (
          '0'
        );
      },
    },
    {
      'data-test-subj': 'policy-indices',
      field: 'indices',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.linkedIndicesHeader', {
        defaultMessage: 'Linked indices',
      }),
      sortable: ({ indices }) => (indices ?? []).length,
      render: (value: string[], policy: PolicyFromES) => {
        return value && value.length > 0 ? (
          <EuiToolTip content={actionTooltips.viewIndices} position="left">
            <EuiLink href={getIndicesListPath(policy.name, getUrlForApp)}>{value.length}</EuiLink>
          </EuiToolTip>
        ) : (
          '0'
        );
      },
    },
    {
      'data-test-subj': 'policy-modifiedDate',
      field: 'modifiedDate',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.modifiedDateHeader', {
        defaultMessage: 'Modified date',
      }),
      sortable: true,
      render: (value: string) => {
        return value ? moment(value).format('MMM D, YYYY') : value;
      },
    },
  ];
  if (!isReadOnly) {
    columns.push({
      actions: [
        {
          isPrimary: true,
          name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.editActionLabel', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.indexLifecycleMgmt.policyTable.editActionDescription',
            {
              defaultMessage: 'Edit this policy',
            }
          ),
          type: 'icon',
          icon: 'pencil',
          onClick: ({ name }) => history.push(getPolicyEditPath(name)),
          'data-test-subj': 'editPolicy',
        },

        {
          name: i18n.translate(
            'xpack.indexLifecycleMgmt.policyTable.addToIndexTemplateActionLabel',
            {
              defaultMessage: 'Add to index template',
            }
          ),
          description: i18n.translate(
            'xpack.indexLifecycleMgmt.policyTable.addToIndexTemplateActionDescription',
            { defaultMessage: 'Add policy to index template' }
          ),
          type: 'icon',
          icon: 'plusInCircle',
          onClick: (policy) =>
            setListAction({ selectedPolicy: policy, actionType: 'addIndexTemplate' }),
          'data-test-subj': 'addPolicyToTemplate',
        },

        {
          isPrimary: true,
          name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.deleteActionLabel', {
            defaultMessage: 'Delete',
          }),
          description: (policy) => {
            return hasLinkedIndices(policy)
              ? i18n.translate(
                  'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledTooltip',
                  {
                    defaultMessage: 'You cannot delete a policy that is being used by an index',
                  }
                )
              : i18n.translate('xpack.indexLifecycleMgmt.policyTable.deleteActionDescription', {
                  defaultMessage: 'Delete this policy',
                });
          },
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (policy) =>
            setListAction({ selectedPolicy: policy, actionType: 'deletePolicy' }),
          enabled: (policy) => !hasLinkedIndices(policy),
          'data-test-subj': 'deletePolicy',
        },
      ],
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      'data-test-subj': 'policyActionsCollapsedButton',
    });
  }

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate('xpack.indexLifecycleMgmt.policyTable.captionText', {
        defaultMessage:
          'The table below contains {count, plural, one {# Index Lifecycle policy} other {# Index Lifecycle policies}} .',
        values: { count: policies.length },
      })}
      pagination={{
        initialPageSize: pageSize,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
      onTableChange={onTableChange}
      sorting={sorting}
      search={searchOptions as EuiInMemoryTableProps<PolicyFromES>['search']}
      tableLayout="auto"
      items={filteredPolicies}
      columns={columns}
      rowProps={(policy: PolicyFromES) => ({ 'data-test-subj': `policyTableRow-${policy.name}` })}
    />
  );
};
