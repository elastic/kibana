/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFieldText,
  EuiFormControlLayout,
  EuiFormRow,
  EuiInputPopover,
  EuiSpacer,
  keys,
} from '@elastic/eui';
import type { EuiFieldTextProps } from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { PROVIDER_REQUIRED, SELECT_PROVIDER } from '../translations';
import { SelectableProvider } from './providers/selectable';
import { SERVICE_PROVIDERS } from './providers/render_service_provider/service_provider';
import type { ServiceProviderKeys } from '../constants';
import type { InferenceProvider } from '../types/types';

const providerConfigConfig = {
  validations: [
    {
      validator: fieldValidators.emptyField(PROVIDER_REQUIRED),
      isBlocking: true,
    },
  ],
};

interface Props {
  currentSolution: SolutionView | undefined;
  provider: string | undefined;
  isEdit?: boolean;
  onClearProvider: () => void;
  onProviderChange: () => void;
  solutionFilter: SolutionView | undefined;
  toggleAndApplyFilter: (solution: SolutionView) => void;
  updatedProviders?: InferenceProvider[];
}

export const ProviderSelect: FC<Props> = ({
  currentSolution,
  isEdit,
  onClearProvider,
  onProviderChange,
  provider,
  solutionFilter,
  toggleAndApplyFilter,
  updatedProviders,
}) => {
  const [isProviderPopoverOpen, setProviderPopoverOpen] = useState(false);

  const providerName = useMemo(
    () =>
      Object.keys(SERVICE_PROVIDERS).includes(provider ?? '')
        ? SERVICE_PROVIDERS[provider as ServiceProviderKeys].name
        : provider,
    [provider]
  );

  const toggleProviderPopover = useCallback(() => {
    setProviderPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closeProviderPopover = useCallback(() => {
    setProviderPopoverOpen(false);
  }, []);

  const handleProviderKeyboardOpen: EuiFieldTextProps['onKeyDown'] = useCallback((event: any) => {
    if (event.key === keys.ENTER) {
      setProviderPopoverOpen(true);
    }
  }, []);

  const providerSuperSelect = useCallback(
    (isInvalid: boolean) => (
      <EuiFormControlLayout
        clear={isEdit ? undefined : { onClick: onClearProvider }}
        isDropdown
        isDisabled={isEdit}
        isInvalid={isInvalid}
        fullWidth
        icon={!provider ? { type: 'sparkles', side: 'left' } : undefined}
      >
        <EuiFieldText
          onClick={toggleProviderPopover}
          data-test-subj="provider-select"
          isInvalid={isInvalid}
          disabled={isEdit}
          onKeyDown={handleProviderKeyboardOpen}
          value={provider ? providerName : ''}
          fullWidth
          placeholder={SELECT_PROVIDER}
          icon={{ type: 'arrowDown', side: 'right' }}
          aria-expanded={isProviderPopoverOpen}
          role="combobox"
          onChange={() => {
            /* Intentionally left blank as onChange is required to avoid console error
              but not used in this context
            */
          }}
        />
      </EuiFormControlLayout>
    ),
    [
      isEdit,
      onClearProvider,
      provider,
      toggleProviderPopover,
      handleProviderKeyboardOpen,
      providerName,
      isProviderPopoverOpen,
    ]
  );

  return (
    <UseField path="config.provider" config={providerConfigConfig}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        const selectInput = providerSuperSelect(isInvalid);
        return (
          <EuiFormRow
            id="providerSelectBox"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.inferenceEndpointUICommon.components.serviceLabel"
                defaultMessage="Service"
              />
            }
            isInvalid={isInvalid}
            error={errorMessage}
          >
            <>
              <EuiSpacer size="s" />
              <EuiInputPopover
                id={'providerInputPopoverId'}
                fullWidth
                input={selectInput}
                isOpen={isProviderPopoverOpen}
                closePopover={closeProviderPopover}
                className="rightArrowIcon"
              >
                <SelectableProvider
                  currentSolution={currentSolution}
                  providers={updatedProviders ?? []}
                  onClosePopover={closeProviderPopover}
                  onProviderChange={onProviderChange}
                  onSolutionFilterChange={toggleAndApplyFilter}
                  solutionFilter={solutionFilter}
                />
              </EuiInputPopover>
            </>
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
