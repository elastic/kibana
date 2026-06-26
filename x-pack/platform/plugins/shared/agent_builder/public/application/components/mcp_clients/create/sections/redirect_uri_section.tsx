/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useRef } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { McpClientFormData } from '../types';
import { RedirectUriType } from '../types';
import { labels } from '../../../../utils/i18n';

const redirectTypeGroupStyles = css`
  max-inline-size: 656px;
`;

const redirectTypeCardStyles = css`
  min-block-size: 64px;
  block-size: 100%;
`;

const redirectUriRowStyles = css`
  & + & {
    margin-block-start: 8px;
  }
`;

const REDIRECT_TYPE_CONFIG: Record<
  RedirectUriType,
  {
    label: string;
    description: string;
    urlsLabel: string;
    helpText: string;
    addButtonLabel: string;
    placeholder?: string;
    testSubjPrefix: string;
  }
> = {
  [RedirectUriType.LOCAL]: {
    label: labels.tools.mcpClients.form.redirectLocal,
    description: labels.tools.mcpClients.form.redirectLocalDescription,
    urlsLabel: labels.tools.mcpClients.form.localUrlsLabel,
    helpText: labels.tools.mcpClients.form.localUrlsHelpText,
    addButtonLabel: labels.tools.mcpClients.form.addLocalUrl,
    placeholder: 'http://localhost:3000/callback',
    testSubjPrefix: 'mcpClientLocalUri',
  },
  [RedirectUriType.REMOTE]: {
    label: labels.tools.mcpClients.form.redirectRemote,
    description: labels.tools.mcpClients.form.redirectRemoteDescription,
    urlsLabel: labels.tools.mcpClients.form.remoteUrlsLabel,
    helpText: labels.tools.mcpClients.form.remoteUrlsHelpText,
    addButtonLabel: labels.tools.mcpClients.form.addRemoteUrl,
    placeholder: 'https://your-domain.com/callback',
    testSubjPrefix: 'mcpClientRemoteUri',
  },
};

const REDIRECT_TYPE_ENTRIES = Object.entries(REDIRECT_TYPE_CONFIG) as Array<
  [RedirectUriType, (typeof REDIRECT_TYPE_CONFIG)[RedirectUriType]]
>;

export const RedirectUriSection = () => {
  const { control, watch, getValues } = useFormContext<McpClientFormData>();
  const redirectUriType = watch('redirect.type');
  const radioGroupName = useGeneratedHtmlId({ prefix: 'redirectUriType' });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'redirect.uris',
  });

  const handleAddUri = useCallback(() => {
    append({ value: '' });
  }, [append]);

  const redirectUrisByTypeRef = useRef<
    Record<RedirectUriType, McpClientFormData['redirect']['uris']>
  >({
    [RedirectUriType.LOCAL]: [],
    [RedirectUriType.REMOTE]: [],
  });

  const handleRedirectTypeChange = useCallback(
    (id: RedirectUriType, onTypeChange: (value: RedirectUriType) => void) => {
      const previousType = getValues('redirect.type');
      if (previousType === id) return;

      redirectUrisByTypeRef.current[previousType] = getValues('redirect.uris');
      onTypeChange(id);

      const restored = redirectUrisByTypeRef.current[id];
      if (id === RedirectUriType.REMOTE) {
        replace(restored?.[0] ? [restored[0]] : [{ value: '' }]);
      } else {
        replace(restored ?? []);
      }
    },
    [getValues, replace]
  );

  const isRemote = redirectUriType === RedirectUriType.REMOTE;
  const { urlsLabel, helpText, addButtonLabel, placeholder, testSubjPrefix } =
    REDIRECT_TYPE_CONFIG[redirectUriType];

  return (
    <>
      <EuiFormRow label={labels.tools.mcpClients.form.redirectTypeLabel}>
        <Controller
          control={control}
          name="redirect.type"
          render={({ field }) => (
            <EuiFlexGroup
              gutterSize="m"
              data-test-subj="mcpClientRedirectTypeRadio"
              css={redirectTypeGroupStyles}
            >
              {REDIRECT_TYPE_ENTRIES.map(([id, { label, description }]) => (
                <EuiFlexItem key={id}>
                  <EuiCheckableCard
                    id={`${radioGroupName}-${id}`}
                    name={radioGroupName}
                    label={
                      <EuiFlexGroup direction="column" gutterSize="xs">
                        <strong>{label}</strong>
                        <EuiText size="s" color="subdued">
                          {description}
                        </EuiText>
                      </EuiFlexGroup>
                    }
                    checked={field.value === id}
                    onChange={() => handleRedirectTypeChange(id, field.onChange)}
                    css={redirectTypeCardStyles}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormFieldset legend={{ children: urlsLabel }}>
        {!isRemote && (
          <>
            <EuiText size="xs" color="subdued">
              {helpText}
            </EuiText>
            <EuiSpacer size="xs" />
          </>
        )}
        {fields.map((field, index) => (
          <Controller
            control={control}
            name={`redirect.uris.${index}.value`}
            key={field.id}
            render={({ field: { ref, ...inputField }, fieldState: { invalid, error } }) => (
              <EuiFormRow isInvalid={invalid} error={error?.message} css={redirectUriRowStyles}>
                <EuiFieldText
                  {...inputField}
                  inputRef={ref}
                  isInvalid={invalid}
                  placeholder={placeholder}
                  data-test-subj={`${testSubjPrefix}-${field.id}`}
                  append={
                    !isRemote && fields.length > 1 ? (
                      <EuiButtonIcon
                        color="danger"
                        iconType="trash"
                        aria-label={labels.tools.mcpClients.form.removeUriAriaLabel}
                        onClick={() => remove(index)}
                        data-test-subj={`mcpClientRemoveUri-${field.id}`}
                      />
                    ) : undefined
                  }
                />
              </EuiFormRow>
            )}
          />
        ))}
        {isRemote && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              {helpText}
            </EuiText>
          </>
        )}
      </EuiFormFieldset>
      {!isRemote && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            size="s"
            iconType="plusInCircle"
            onClick={handleAddUri}
            data-test-subj="mcpClientAddUri"
          >
            {addButtonLabel}
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};
