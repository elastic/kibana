/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useState } from 'react';
import {
  EuiButton,
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
import { Form, useForm } from '../shared_imports';
import { schema } from './schema';
import { DescriptionMarkdown } from '../description_md_editor';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
import { CommonUseField } from '../create';
import { caseTypeOptions, stateOptions } from '../create/form_options';
import { NewCaseFormatted } from '../../../../containers/case/types';

interface Props {
  caseId: string;
}

interface CaseDetail {
  title: React.ReactNode;
  definition: string | number | JSX.Element | null;
  edit?: JSX.Element;
}

const getDictionary = (
  { title, definition, edit }: CaseDetail,
  key: number,
  isEdit: boolean = false
) => {
  return definition ? (
    <Fragment key={key}>
      {isEdit && edit ? null : <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>}
      <EuiDescriptionListDescription>
        {isEdit && edit ? edit : definition}
      </EuiDescriptionListDescription>
    </Fragment>
  ) : null;
};
export const CaseView = React.memo(({ caseId }: Props) => {
  const [{ data, isLoading, isError }, refreshCase] = useGetCase(caseId);
  if (isError) {
    return null;
  }
  const [isEdit, setIsEdit] = useState(false);
  const [setFormData] = useUpdateCase(caseId, data);
  const { form } = useForm({
    defaultValue: data,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid) {
      setFormData({ ...newData, isNew: true } as NewCaseFormatted);
      refreshCase(newData as NewCaseFormatted);
      setIsEdit(false);
    }
  }, [form]);

  const caseDetailsDefinitions: CaseDetail[] = [
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
      edit: (
        <CommonUseField
          path="tags"
          componentProps={{
            idAria: 'caseTags',
            'data-test-subj': 'caseTags',
            euiFieldProps: {
              fullWidth: true,
              placeholder: '',
            },
            isDisabled: isLoading,
          }}
        />
      ),
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
          {isEdit ? (
            <EuiFlexItem grow={false}>
              <EuiButton fill isDisabled={isLoading} isLoading={isLoading} onClick={onSubmit}>
                {i18n.SUBMIT}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setIsEdit(!isEdit)}>
              {isEdit ? i18n.CANCEL : i18n.EDIT}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderPage>
      {isEdit ? (
        <Form form={form}>
          <EuiDescriptionList compressed>
            {caseDetailsDefinitions.map((dictionaryItem, key) =>
              getDictionary(dictionaryItem, key, isEdit)
            )}
          </EuiDescriptionList>
        </Form>
      ) : (
        <EuiDescriptionList compressed>
          {caseDetailsDefinitions.map((dictionaryItem, key) =>
            getDictionary(dictionaryItem, key, isEdit)
          )}
        </EuiDescriptionList>
      )}
    </EuiFlexItem>
  );
});

CaseView.displayName = 'CaseView';
