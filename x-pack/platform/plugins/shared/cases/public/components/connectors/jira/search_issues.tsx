/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo } from 'react';
import { isEmpty } from 'lodash';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useIsUserTyping } from '../../../common/use_is_user_typing';
import { useKibana } from '../../../common/lib/kibana';
import type { ActionConnector } from '../../../../common/types/domain';
import { useGetIssues } from './use_get_issues';
import * as i18n from './translations';
import { useGetIssue } from './use_get_issue';

interface FieldProps {
  field: FieldHook<string>;
  options: Array<EuiComboBoxOptionOption<string>>;
  isLoading: boolean;
  onSearchComboChange: (value: string) => void;
}

interface Props {
  actionConnector?: ActionConnector;
}

const SearchIssuesFieldComponent: React.FC<FieldProps> = ({
  field,
  options,
  isLoading,
  onSearchComboChange,
}) => {
  const { value: parent } = field;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const selectedOptions = [parent]
    .map((currentParent: string) => {
      const selectedParent = options.find((issue) => issue.value === currentParent);

      if (selectedParent) {
        return selectedParent;
      }

      return null;
    })
    .filter((value): value is EuiComboBoxOptionOption<string> => value != null);

  const onChangeComboBox = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    field.setValue(changedOptions.length ? changedOptions[0].value ?? '' : '');
  };

  return (
    <EuiFormRow
      id="indexConnectorSelectSearchBox"
      fullWidth
      label={i18n.PARENT_ISSUE}
      isInvalid={isInvalid}
      error={errorMessage}
    >
      <EuiComboBox
        fullWidth
        singleSelection
        async
        placeholder={i18n.SEARCH_ISSUES_PLACEHOLDER}
        aria-label={i18n.SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL}
        isLoading={isLoading}
        isInvalid={isInvalid}
        noSuggestions={!options.length}
        options={options}
        data-test-subj="search-parent-issues"
        data-testid="search-parent-issues"
        selectedOptions={selectedOptions}
        onChange={onChangeComboBox}
        onSearchChange={onSearchComboChange}
      />
    </EuiFormRow>
  );
};
SearchIssuesFieldComponent.displayName = 'SearchIssuesField';

const SearchIssuesComponent: React.FC<Props> = ({ actionConnector }) => {
  const { http } = useKibana().services;
  const [{ fields }] = useFormData<{ fields?: { parent: string } }>({
    watch: ['fields.parent'],
  });

  const [query, setQuery] = useState<string | null>(null);
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();

  const { isFetching: isLoadingIssues, data: issuesData } = useGetIssues({
    http,
    actionConnector,
    query,
    onDebounce,
  });

  const { isFetching: isLoadingIssue, data: issueData } = useGetIssue({
    http,
    actionConnector,
    id: fields?.parent ?? '',
  });

  const issues = issuesData?.data ?? [];
  const issue = issueData?.data ? [issueData.data] : [];

  const onSearchComboChange = (value: string) => {
    if (!isEmpty(value)) {
      setQuery(value);
    }

    onContentChange(value);
  };

  const isLoading = isUserTyping || isLoadingIssues || isLoadingIssue;
  const options = [...issues, ...issue].map((_issue) => ({
    label: _issue.title,
    value: _issue.key,
  }));

  return (
    <UseField<string>
      path="fields.parent"
      component={SearchIssuesFieldComponent}
      componentProps={{
        isLoading,
        onSearchComboChange,
        options,
      }}
    />
  );
};

SearchIssuesComponent.displayName = 'SearchIssues';

export const SearchIssues = memo(SearchIssuesComponent);
