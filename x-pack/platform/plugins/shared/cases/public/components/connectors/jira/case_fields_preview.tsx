/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import * as i18n from './translations';

import type { JiraFieldsType } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsPreviewProps } from '../types';
import { useGetIssueTypes } from './use_get_issue_types';
import { ConnectorCard } from '../card';

const JiraFieldsPreviewComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<JiraFieldsType>
> = ({ fields, connector }) => {
  const { http } = useKibana().services;
  const { issueType = null, priority = null, parent = null } = fields ?? {};

  const {
    isLoading,
    isFetching,
    data: issueTypesData,
  } = useGetIssueTypes({
    connector,
    http,
  });

  const issueTypes = issueTypesData?.data;

  const listItems = useMemo(
    () => [
      ...(issueType != null && issueType.length > 0
        ? [
            {
              title: i18n.ISSUE_TYPE,
              description: (issueTypes ?? []).find((issue) => issue.id === issueType)?.name ?? '',
            },
          ]
        : []),
      ...(parent != null && parent.length > 0
        ? [
            {
              title: i18n.PARENT_ISSUE,
              description: parent,
            },
          ]
        : []),
      ...(priority != null && priority.length > 0
        ? [
            {
              title: i18n.PRIORITY,
              description: priority,
            },
          ]
        : []),
    ],
    [issueType, issueTypes, parent, priority]
  );

  return (
    <ConnectorCard
      connectorType={ConnectorTypes.jira}
      isLoading={isLoading || isFetching}
      listItems={listItems}
      title={connector.name}
    />
  );
};

JiraFieldsPreviewComponent.displayName = 'JiraFieldsPreview';

// eslint-disable-next-line import/no-default-export
export { JiraFieldsPreviewComponent as default };
