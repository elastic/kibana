/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  issuesFilterLabel,
  issueTypeFilterSearchPlaceholder,
  issueTypeFilterNoneAvailable,
  issueTypeFilterNoneMatching,
} from '../../../../../../common/translations';
import { Selector } from '../../../../dataset_quality/filters/selector';
import { useQualityIssuesFilters } from '../../../../../hooks/use_quality_issues_filters';

export function IssueTypeSelector() {
  const { issueTypeItems, onIssueTypesChange } = useQualityIssuesFilters();

  return (
    <Selector
      dataTestSubj="datasetQualityDetailsIssueTypeSelector"
      options={issueTypeItems}
      label={issuesFilterLabel}
      searchPlaceholder={issueTypeFilterSearchPlaceholder}
      noneAvailableMessage={issueTypeFilterNoneAvailable}
      noneMatchingMessage={issueTypeFilterNoneMatching}
      onOptionsChange={onIssueTypesChange}
    />
  );
}
