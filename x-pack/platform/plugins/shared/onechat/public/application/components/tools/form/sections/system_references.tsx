/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ToolFormSection } from '../components/tool_form_section';
import { ToolFormMode } from '../tool_form';
import type { EsqlToolFormData } from '../types/tool_form_types';

export interface SystemReferencesProps {
  mode: ToolFormMode;
}
export const SystemReferences = ({ mode }: SystemReferencesProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    control,
    formState: { errors },
  } = useFormContext<EsqlToolFormData>();

  return (
    <ToolFormSection
      title="System references"
      icon="bullseye"
      description="These values are used by agents and configurations, not shown to end users."
      content={
        <EuiFlexGroup
          direction="column"
          css={css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            padding: ${euiTheme.size.base};
          `}
        >
          <EuiText color={euiTheme.colors.textHeading}>
            <h4>What are these fields?</h4>
          </EuiText>
          <EuiFlexItem grow={0}>
            <EuiText size="s">
              <strong>Tool ID</strong>
              <EuiTextColor color="subdued">
                <div>Unique ID for reference the tool in code or configurations.</div>
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiText size="s">
              <strong>Description</strong>
              <EuiTextColor color="subdued">
                <div>
                  Shapes tool behavior and agent understanding. Start with a short human-friendly
                  summary — the first ~50 characters appear in the tool list.
                </div>
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      documentation={{
        title: 'Tool basics',
        href: 'https://www.elastic.co/guide/en/enterprise-search/current/tool-basics.html',
      }}
    >
      <EuiFormRow
        isDisabled={mode === ToolFormMode.Edit}
        label={i18n.translate('xpack.onechat.tools.newTool.toolIdLabel', {
          defaultMessage: 'Tool ID',
        })}
        isInvalid={!!errors.toolId}
        helpText={'Must be lowercase with no spaces.'}
        error={errors.toolId?.message}
      >
        <Controller
          control={control}
          name="toolId"
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              disabled={mode === ToolFormMode.Edit}
              {...field}
              inputRef={ref}
              isInvalid={invalid}
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.onechat.tools.newTool.descriptionLabel', {
          defaultMessage: 'Description',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            Optional
          </EuiText>
        }
        isInvalid={!!errors.description}
        error={errors.description?.message}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <EuiMarkdownEditor
              aria-label={i18n.translate('xpack.onechat.tools.newTool.descriptionAriaLabel', {
                defaultMessage: 'Description',
              })}
              height={482}
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </ToolFormSection>
  );
};
