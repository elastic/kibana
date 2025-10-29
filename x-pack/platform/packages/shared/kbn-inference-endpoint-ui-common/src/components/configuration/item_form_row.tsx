/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { ConfigEntryView } from '../../types/types';
import { ConfigFieldTitularComponent } from './titular_component_registry';
import { ConfigurationField } from './configuration_field';
import * as LABELS from '../../translations';

interface ItemFormRowProps {
  configEntry: ConfigEntryView;
  dataTestSubj?: string;
  descriptionLinks?: Record<string, React.ReactNode>;
  isPreconfigured?: boolean;
  isInternalProvider?: boolean;
  isEdit?: boolean;
  isLoading: boolean;
  setConfigEntry: (key: string, value: string | number | boolean | null) => void;
}

export const ItemFormRow: React.FC<ItemFormRowProps> = ({
  configEntry,
  descriptionLinks,
  isPreconfigured,
  isInternalProvider,
  isEdit,
  isLoading,
  setConfigEntry,
}) => {
  const { description, isValid, key, label, required, sensitive, validationErrors } = configEntry;

  // toggle and sensitive textarea labels go next to the element, not in the row
  const rowLabel = description ? (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <p>{label}</p>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <p>{label}</p>
  );

  let helpText: string | React.ReactNode | null = description;
  if (isInternalProvider && key === 'model_id' && !isPreconfigured) {
    helpText = (
      <>
        {description}{' '}
        <EuiLink
          href="https://www.elastic.co/docs/explore-analyze/elastic-inference/inference-api#default-enpoints"
          external
          target="_blank"
        >
          {LABELS.LEARN_MORE}
        </EuiLink>
      </>
    );
  } else if (typeof description === 'string' && descriptionLinks && descriptionLinks[key]) {
    const regex = /\{.*\}/;
    const substrings = description.split(regex);
    helpText = (
      <>
        {substrings[0]} {descriptionLinks[key]} {substrings.slice(1)}
      </>
    );
  }

  const optionalLabel = !required ? (
    <EuiText color="subdued" size="xs">
      {LABELS.OPTIONALTEXT}
    </EuiText>
  ) : undefined;

  return (
    <EuiFlexItem key={key}>
      <ConfigFieldTitularComponent configKey={key} />
      <EuiFormRow
        label={rowLabel}
        fullWidth
        helpText={helpText}
        error={validationErrors}
        isInvalid={!isValid}
        labelAppend={optionalLabel}
        data-test-subj={`configuration-formrow-${key}`}
      >
        <ConfigurationField
          configEntry={configEntry}
          isLoading={isLoading}
          setConfigValue={(value) => {
            setConfigEntry(key, value);
          }}
          isEdit={isEdit}
          isPreconfigured={isPreconfigured}
        />
      </EuiFormRow>
      {sensitive ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut size="s" color="warning" title={LABELS.RE_ENTER_SECRETS(label)} />
        </>
      ) : null}
    </EuiFlexItem>
  );
};
