/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';

import {
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH } from '@kbn/alerting-types/rule/latest';
import {
  RULE_INVESTIGATION_GUIDE_LABEL,
  RULE_INVESTIGATION_GUIDE_LABEL_TOOLTIP_CONTENT,
  RULE_NAME_INPUT_TITLE,
  RULE_TAG_INPUT_TITLE,
  RULE_TAG_PLACEHOLDER,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import { OptionalFieldLabel } from '../optional_field_label';
import { InvestigationGuideEditor } from './rule_investigation_guide_editor';
import { RuleDashboards } from './rule_dashboards';
import { LabelWithTooltip } from './label_with_tooltip';

export const RULE_DETAIL_MIN_ROW_WIDTH = 600;

export const RuleDetails = () => {
  const { formData, baseErrors, plugins } = useRuleFormState();
  const { uiActions } = plugins;

  const dispatch = useRuleFormDispatch();

  const { tags = [], name } = formData;

  const tagsOptions = useMemo(() => {
    return tags.map((tag: string) => ({ label: tag }));
  }, [tags]);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: 'setName',
        payload: e.target.value,
      });
    },
    [dispatch]
  );

  const onAddTag = useCallback(
    (searchValue: string) => {
      dispatch({
        type: 'setTags',
        payload: tags.concat([searchValue]),
      });
    },
    [dispatch, tags]
  );

  const onSetTag = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      dispatch({
        type: 'setTags',
        payload: options.map((selectedOption) => selectedOption.label),
      });
    },
    [dispatch]
  );

  const onBlur = useCallback(() => {
    if (!tags) {
      dispatch({
        type: 'setTags',
        payload: [],
      });
    }
  }, [dispatch, tags]);

  const onSetArtifacts = useCallback(
    (value: object) => {
      dispatch({
        type: 'setRuleProperty',
        payload: {
          property: 'artifacts',
          value: formData.artifacts ? { ...formData.artifacts, ...value } : value,
        },
      });
    },
    [dispatch, formData.artifacts]
  );

  const flexItemCss = css`
    min-width: 0;
  `;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={1} css={flexItemCss}>
          <EuiFormRow
            data-test-subj="ruleDetails"
            fullWidth
            label={RULE_NAME_INPUT_TITLE}
            isInvalid={!!baseErrors?.name?.length}
            error={baseErrors?.name}
          >
            <EuiFieldText
              fullWidth
              value={name}
              placeholder={RULE_NAME_INPUT_TITLE}
              onChange={onNameChange}
              data-test-subj="ruleDetailsNameInput"
              isInvalid={!!baseErrors?.name?.length}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={1} css={flexItemCss}>
          <EuiFormRow
            fullWidth
            label={RULE_TAG_INPUT_TITLE}
            labelAppend={OptionalFieldLabel}
            isInvalid={!!baseErrors?.tags?.length}
            error={baseErrors?.tags}
          >
            <EuiComboBox
              isInvalid={!!baseErrors?.tags?.length}
              fullWidth
              noSuggestions
              placeholder={RULE_TAG_PLACEHOLDER}
              data-test-subj="ruleDetailsTagsInput"
              selectedOptions={tagsOptions}
              onCreateOption={onAddTag}
              onChange={onSetTag}
              onBlur={onBlur}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFormRow
        fullWidth
        label={
          <LabelWithTooltip
            labelContent={RULE_INVESTIGATION_GUIDE_LABEL}
            tooltipContent={RULE_INVESTIGATION_GUIDE_LABEL_TOOLTIP_CONTENT}
          />
        }
        labelAppend={OptionalFieldLabel}
        isInvalid={
          (formData.artifacts?.investigation_guide?.blob?.length ?? 0) >
          MAX_ARTIFACTS_INVESTIGATION_GUIDE_LENGTH
        }
      >
        <InvestigationGuideEditor
          setRuleParams={onSetArtifacts}
          value={formData.artifacts?.investigation_guide?.blob ?? ''}
        />
      </EuiFormRow>
      {uiActions && <RuleDashboards uiActions={uiActions} />}
      <EuiSpacer size="xxl" />
    </>
  );
};
