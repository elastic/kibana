/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiComboBoxOptionOption, EuiHealth, EuiFormRow } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAgentPoliciesSpaces, useStartServices } from '../../../../../../hooks';

export interface SpaceSelectorProps {
  value: string[];
  onChange: (newVal: string[]) => void;
  isDisabled?: boolean;
  setInvalidSpaceError?: (hasError: boolean) => void;
}

const useSpacesContextWrapper = () => {
  const { spaces } = useStartServices();

  return useMemo(
    () =>
      spaces ? spaces.ui.components.getSpacesContextProvider : ({ children }: any) => children,
    [spaces]
  );
};

function useAllSpaces() {
  const start = useStartServices();
  const useSpace = start.spaces?.ui.useSpaces;
  const spacesManager = useSpace?.()?.spacesManager;
  const { data } = useQuery(
    ['get-all-spaces'],
    () =>
      spacesManager?.getSpaces({
        purpose: 'any',
      }) ?? []
  );

  const allSpaces = useMemo(() => data ?? [], [data]);

  return { allSpaces };
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = (props) => {
  const Wrapper = useSpacesContextWrapper();

  return (
    <Wrapper>
      <SpaceSelectorComponent {...props} />
    </Wrapper>
  );
};

export const SpaceSelectorComponent: React.FC<SpaceSelectorProps> = ({
  setInvalidSpaceError,
  value,
  onChange,
  isDisabled,
}) => {
  const res = useAgentPoliciesSpaces();
  const { allSpaces } = useAllSpaces();

  const [error, setError] = React.useState<string>();

  const renderOption = React.useCallback(
    (option: any, searchValue: string, contentClassName: string) => {
      return (
        <EuiHealth color={option.color}>
          <span className={contentClassName}>{option.label}</span>
        </EuiHealth>
      );
    },
    []
  );

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    return (
      res.data?.items.map((item: any) => ({
        label: item.name,
        key: item.id,
        color: item.color,
      })) ?? []
    );
  }, [res.data]);

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    if (res.isInitialLoading) {
      return [];
    }
    return value.map((v) => {
      const existingOption = options.find((opt) => opt.key === v);

      if (existingOption) {
        return existingOption;
      }
      const existingSpace = allSpaces.find((space) => space.id === v);
      const color = existingSpace?.color;
      const label = existingSpace?.name ?? v;

      return existingOption
        ? existingOption
        : {
            label,
            key: v,
            color,
          };
    });
  }, [options, value, res.isInitialLoading, allSpaces]);

  return (
    <EuiFormRow
      fullWidth
      key="space"
      error={error}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
    >
      <EuiComboBox
        data-test-subj={'spaceSelectorComboBox'}
        aria-label={i18n.translate('xpack.fleet.agentPolicies.spaceSelectorLabel', {
          defaultMessage: 'Spaces',
        })}
        fullWidth
        options={options}
        renderOption={renderOption}
        selectedOptions={selectedOptions}
        isDisabled={res.isInitialLoading || isDisabled}
        isClearable={false}
        onSearchChange={(searchValue, hasMatchingOptions) => {
          const newError =
            searchValue.length === 0 || hasMatchingOptions
              ? undefined
              : i18n.translate('xpack.fleet.agentPolicies.spaceSelectorInvalid', {
                  defaultMessage: '{space} is not a valid space.',
                  values: { space: searchValue },
                });
          setError(newError);
          if (setInvalidSpaceError) {
            setInvalidSpaceError(!!newError);
          }
        }}
        onChange={(newOptions) => {
          onChange(newOptions.map(({ key }) => key as string));
        }}
      />
    </EuiFormRow>
  );
};
