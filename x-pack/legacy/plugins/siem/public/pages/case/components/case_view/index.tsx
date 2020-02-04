/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { HeaderPage } from '../../../../components/header_page';
import * as i18n from '../../translations';
import { getCaseUrl } from '../../../../components/link_to';
import { useGetCase } from '../../../../containers/case/use_get_case';

interface Props {
  caseId: string;
}

const getDictionary = (
  title: React.ReactNode,
  definition: string | number | JSX.Element | null,
  key: number
) => {
  return definition ? (
    <Fragment key={key}>
      <dt>{title}</dt>
      <dd>{definition}</dd>
    </Fragment>
  ) : null;
};
export const CaseView = React.memo(({ caseId }: Props) => {
  const [{ data, isLoading, isError }] = useGetCase(caseId);
  if (isError) {
    return null;
  }
  const caseDetailsDefinitions = [
    {
      title: <FormattedMessage id="xpack.siem.caseView.description" defaultMessage="Description" />,
      definition: data.description,
    },
    {
      title: <FormattedMessage id="xpack.siem.caseView.case_type" defaultMessage="Case type" />,
      definition: data.case_type,
    },
    {
      title: <FormattedMessage id="xpack.siem.caseView.state" defaultMessage="State" />,
      definition: data.state,
    },
    {
      title: <FormattedMessage id="xpack.siem.caseView.updated_at" defaultMessage="Last updated" />,
      definition: data.updated_at,
    },
    {
      title: <FormattedMessage id="xpack.siem.caseView.created_at" defaultMessage="Created at" />,
      definition: data.created_at,
    },
    {
      title: <FormattedMessage id="xpack.siem.caseView.created_by" defaultMessage="Created by" />,
      definition: data.created_by.username,
    },
    {
      title: <FormattedMessage id="xpack.siem.caseView.tags" defaultMessage="Tags" />,
      definition:
        data.tags.length > 0 ? (
          <ul>
            {data.tags.map((tag: string, key: number) => (
              <li key={key + tag}>{tag}</li>
            ))}
          </ul>
        ) : null,
    },
  ];
  return isLoading ? (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexItem>
      <HeaderPage
        backOptions={{
          href: getCaseUrl(),
          text: i18n.BACK_TO_ALL,
        }}
        border
        subtitle={caseId}
        title={data.title}
      />
      <EuiText>
        <dl className="eui-definitionListReverse">
          {caseDetailsDefinitions.map((dictionaryItem, key) =>
            getDictionary(dictionaryItem.title, dictionaryItem.definition, key)
          )}
        </dl>
      </EuiText>
    </EuiFlexItem>
  );
});

CaseView.displayName = 'CaseView';
