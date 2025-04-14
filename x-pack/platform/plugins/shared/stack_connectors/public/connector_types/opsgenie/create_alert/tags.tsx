/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHighlight,
  EuiTextColor,
} from '@elastic/eui';

import { ActionConnectorMode, ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { OpsgenieActionParams } from '../../../../server/connector_types';
import { RULE_TAGS_TEMPLATE } from '../../../../common/opsgenie';
import * as i18n from './translations';
import { EditActionCallback } from '../types';
import { OptionalFieldLabel } from '../../../common/optional_field_label';

interface TagsProps {
  onChange: EditActionCallback;
  values: string[];
  executionMode: ActionParamsProps<OpsgenieActionParams>['executionMode'];
}

const options: Array<EuiComboBoxOptionOption<string>> = [
  {
    label: RULE_TAGS_TEMPLATE,
    key: RULE_TAGS_TEMPLATE,
    'data-test-subj': 'opsgenie-tags-rule-tags',
    value: i18n.RULE_TAGS_DESCRIPTION,
  },
];

const TagsComponent: React.FC<TagsProps> = ({ onChange, values, executionMode }) => {
  const tagOptions = useMemo(() => values.map((value) => getTagAsOption(value)), [values]);

  const onCreateOption = useCallback(
    (tagValue: string) => {
      const newTags = [...tagOptions, getTagAsOption(tagValue)];
      onChange(
        'tags',
        newTags.map((tag) => tag.label)
      );
    },
    [onChange, tagOptions]
  );

  const onTagsChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      onChange(
        'tags',
        newOptions.map((option) => option.label)
      );
    },
    [onChange]
  );

  const renderOption = useCallback((option: EuiComboBoxOptionOption, searchValue: string) => {
    return (
      <EuiFlexGroup alignItems="baseline" gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiFlexItem>
        {option.value && (
          <EuiFlexItem>
            <EuiTextColor color="subdued">{option.value}</EuiTextColor>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, []);

  return (
    <EuiFormRow
      data-test-subj="opsgenie-tags-row"
      fullWidth
      label={i18n.TAGS_FIELD_LABEL}
      labelAppend={OptionalFieldLabel}
      helpText={i18n.TAGS_HELP}
    >
      <EuiComboBox
        rowHeight={50}
        fullWidth
        isClearable
        options={executionMode === ActionConnectorMode.ActionForm ? options : undefined}
        selectedOptions={tagOptions}
        onCreateOption={onCreateOption}
        onChange={onTagsChange}
        data-test-subj="opsgenie-tags"
        renderOption={renderOption}
      />
    </EuiFormRow>
  );
};

TagsComponent.displayName = 'Tags';

export const Tags = React.memo(TagsComponent);

const getTagAsOption = (value: string) => ({ label: value, key: value });
