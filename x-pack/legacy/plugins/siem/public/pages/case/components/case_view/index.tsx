/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { Markdown } from '../../../../components/markdown';
import { HeaderPage } from '../../../../components/header_page';
import * as i18n from '../../translations';
import { getCaseUrl } from '../../../../components/link_to';
import { useGetCase } from '../../../../containers/case/use_get_case';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { useForm } from '../shared_imports';
import { schema } from './schema';
import { DescriptionMarkdown } from '../description_md_editor';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
import { CommonUseField } from '../create';
import { caseTypeOptions, stateOptions } from '../create/form_options';

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
      <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>{definition}</EuiDescriptionListDescription>
    </Fragment>
  ) : null;
};
export const CaseView = React.memo(({ caseId }: Props) => {
  const [{ data, isLoading, isError }] = useGetCase(caseId);
  if (isError) {
    return null;
  }
  const [isEdit, setIsEdit] = useState(false);
  const [{}, setFormData] = useUpdateCase(data);
  const { form } = useForm({
    defaultValue: data,
    options: { stripEmptyFields: false },
    schema,
  });
  const caseDetailsDefinitions = [
    {
      title: i18n.DESCRIPTION,
      edit: (
        <DescriptionMarkdown
          descriptionInputHeight={200}
          initialDescription={data.description}
          isLoading={isLoading}
          onChange={description => setFormData({ ...data, description })}
        />
      ),
      definition: <Markdown raw={data.description} />,
    },
    {
      title: i18n.CASE_TYPE,
      edit: (
        <CommonUseField
          path="case_type"
          componentProps={{
            idAria: 'caseType',
            'data-test-subj': 'caseType',
            euiFieldProps: {
              fullWidth: false,
              options: caseTypeOptions,
            },
            isDisabled: isLoading,
          }}
        />
      ),
      definition: data.case_type,
    },
    {
      title: i18n.STATE,
      edit: (
        <CommonUseField
          path="state"
          componentProps={{
            idAria: 'state',
            'data-test-subj': 'state',
            euiFieldProps: {
              fullWidth: false,
              options: stateOptions,
            },
            isDisabled: isLoading,
          }}
        />
      ),
      definition: data.state,
    },
    {
      title: i18n.LAST_UPDATED,
      definition: <FormattedRelativePreferenceDate value={data.updated_at} />,
    },
    {
      title: i18n.CREATED_AT,
      definition: <FormattedRelativePreferenceDate value={data.created_at} />,
    },
    {
      title: i18n.CREATED_BY,
      definition: data.created_by.username,
    },
    {
      title: i18n.TAGS,
      edit: data.description,
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
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
          <EuiButtonEmpty href="">{i18n.EDIT}</EuiButtonEmpty>
        </EuiFlexGroup>
      </HeaderPage>
      <EuiDescriptionList compressed>
        {caseDetailsDefinitions.map((dictionaryItem, key) =>
          getDictionary(dictionaryItem.title, dictionaryItem.definition, key)
        )}
      </EuiDescriptionList>
    </EuiFlexItem>
  );
});

CaseView.displayName = 'CaseView';
