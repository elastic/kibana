/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { map } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import { isEmpty } from 'lodash';
import type { JiraFieldsType } from '../../../../common/types/domain';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsProps } from '../types';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { SearchIssues } from './search_issues';

const { emptyField } = fieldValidators;

const JiraFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = ({ connector }) => {
  const [{ fields }] = useFormData<{ fields: JiraFieldsType }>();
  const { http } = useKibana().services;

  const { issueType } = fields ?? {};

  const {
    isLoading: isLoadingIssueTypesData,
    isFetching: isFetchingIssueTypesData,
    data: issueTypesData,
  } = useGetIssueTypes({
    connector,
    http,
  });

  const issueTypes = issueTypesData?.data ?? [];

  const issueTypesSelectOptions = issueTypes.map((type) => ({
    text: type.name ?? '',
    value: type.id ?? '',
  }));

  const {
    isLoading: isLoadingFieldsData,
    isFetching: isFetchingFieldsData,
    data: fieldsByIssueTypeData,
  } = useGetFieldsByIssueType({
    connector,
    http,
    issueType,
  });

  const fieldsByIssueType = fieldsByIssueTypeData?.data;

  const hasPriority = fieldsByIssueType?.priority != null;
  const hasParent = fieldsByIssueType?.parent != null;
  const isLoadingIssueTypes = isLoadingIssueTypesData || isFetchingIssueTypesData;
  const isLoadingFields = isLoadingFieldsData || isFetchingFieldsData;

  const prioritiesSelectOptions = useMemo(() => {
    const priorities = fieldsByIssueType?.priority?.allowedValues ?? [];
    return map(
      (p) => ({
        text: p.name,
        value: p.name,
      }),
      priorities
    );
  }, [fieldsByIssueType]);

  return (
    <div data-test-subj={'connector-fields-jira'}>
      <UseField
        path="fields.issueType"
        component={SelectField}
        config={{
          label: i18n.ISSUE_TYPE,
          validations: [
            {
              validator: emptyField(i18n.ISSUE_TYPE_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'issueTypeSelect',
            options: issueTypesSelectOptions,
            fullWidth: true,
            disabled: isLoadingIssueTypes,
            isLoading: isLoadingIssueTypes,
            hasNoInitialSelection: true,
          },
        }}
      />
      <EuiSpacer size="m" />
      <EuiSkeletonText
        lines={5}
        size="m"
        isLoading={isLoadingFields && !isLoadingIssueTypes && !isEmpty(issueType)}
        data-test-subj="fields-by-issue-type-loading"
      >
        <div style={{ display: hasParent ? 'block' : 'none' }}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <SearchIssues actionConnector={connector} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </div>
        <div style={{ display: hasPriority ? 'block' : 'none' }}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField
                path="fields.priority"
                component={SelectField}
                config={{
                  label: i18n.PRIORITY,
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'prioritySelect',
                    options: prioritiesSelectOptions,
                    fullWidth: true,
                    disabled: isLoadingIssueTypes || isLoadingFields,
                    isLoading: isLoadingFields,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiSkeletonText>
    </div>
  );
};

JiraFieldsComponent.displayName = 'JiraFields';

// eslint-disable-next-line import/no-default-export
export { JiraFieldsComponent as default };
