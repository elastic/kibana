/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  fieldsFilterLabel,
  fieldFilterSearchPlaceholder,
  fieldFilterNoneAvailable,
  fieldFilterNoneMatching,
} from '../../../../../../common/translations';
import { Selector } from '../../../../dataset_quality/filters/selector';
import { useQualityIssuesFilters } from '../../../../../hooks/use_quality_issues_filters';

export function FieldSelector() {
  const { fieldItems, onFieldsChange } = useQualityIssuesFilters();

  return (
    <Selector
      dataTestSubj="datasetQualityDetailsFieldSelector"
      options={fieldItems}
      label={fieldsFilterLabel}
      searchPlaceholder={fieldFilterSearchPlaceholder}
      noneAvailableMessage={fieldFilterNoneAvailable}
      noneMatchingMessage={fieldFilterNoneMatching}
      onOptionsChange={onFieldsChange}
    />
  );
}
