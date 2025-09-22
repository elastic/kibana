/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { Phases, PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiHighlight, EuiPanel, EuiSelectable, EuiText } from '@elastic/eui';
import { rolloverCondition } from '../../helpers/rollover_condition';
import { getFormattedError } from '../../../../../util/errors';

interface IlmOptionData {
  phases?: string;
}

interface ModalOptions {
  getIlmPolicies: () => Promise<PolicyFromES[]>;
  initialValue: IngestStreamLifecycle;
  setLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  setSaveButtonDisabled: (isDisabled: boolean) => void;
  readOnly: boolean;
}

export function IlmField({
  getIlmPolicies,
  initialValue,
  setLifecycle,
  setSaveButtonDisabled,
  readOnly,
}: ModalOptions) {
  const [selectedPolicy, setSelectedPolicy] = useState(
    isIlmLifecycle(initialValue) ? initialValue.ilm?.policy : undefined
  );
  const [policies, setPolicies] = useState<Array<EuiSelectableOption<IlmOptionData>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    setSelectedPolicy(isIlmLifecycle(initialValue) ? initialValue.ilm?.policy : undefined);
  }, [initialValue]);

  useEffect(() => {
    const phasesDescription = (phases: Phases) => {
      const desc: string[] = [];
      if (phases.hot) {
        const rolloverConditions = rolloverCondition(phases.hot.actions.rollover);
        desc.push(
          `Hot (${rolloverConditions ? 'rollover when ' + rolloverConditions : 'no rollover'})`
        );
      }
      if (phases.warm) {
        desc.push(`Warm after ${phases.warm.min_age}`);
      }
      if (phases.cold) {
        desc.push(`Cold after ${phases.cold.min_age}`);
      }
      if (phases.frozen) {
        desc.push(`Frozen after ${phases.frozen.min_age}`);
      }
      if (phases.delete) {
        desc.push(`Delete after ${phases.delete.min_age}`);
      } else {
        desc.push('Keep data indefinitely');
      }

      return desc.join(', ');
    };

    setIsLoading(true);
    getIlmPolicies()
      .then((ilmPolicies) => {
        const policyOptions = ilmPolicies.map(
          ({ name, policy }): EuiSelectableOption<IlmOptionData> => ({
            label: `${name}`,
            searchableLabel: name,
            checked: selectedPolicy === name ? 'on' : undefined,
            data: {
              phases: phasesDescription(policy.phases),
            },
          })
        );

        setPolicies(policyOptions);
      })
      .catch((error) => {
        setErrorMessage(getFormattedError(error).message);
      })
      .finally(() => setIsLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialPolicyOption = isIlmLifecycle(initialValue)
    ? policies.find((option) => option.label === initialValue.ilm.policy)
    : undefined;

  if (readOnly) {
    return (
      initialPolicyOption && (
        <EuiPanel hasBorder hasShadow={false} paddingSize="s" color="subdued">
          <>
            {initialPolicyOption.label}
            <EuiText size="xs" color="subdued" className="eui-displayBlock">
              <small>{initialPolicyOption.data?.phases || ''}</small>
            </EuiText>
          </>
        </EuiPanel>
      )
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      <EuiSelectable
        searchable
        singleSelection
        isLoading={isLoading}
        options={policies}
        errorMessage={errorMessage}
        onChange={(options) => {
          const newSelectedPolicy = options.find((option) => option.checked === 'on')?.label;
          setSelectedPolicy(newSelectedPolicy);
          setPolicies(options);
          if (newSelectedPolicy) {
            setSaveButtonDisabled(false);
            setLifecycle({ ilm: { policy: newSelectedPolicy } });
          } else {
            setSaveButtonDisabled(true);
          }
        }}
        listProps={{
          rowHeight: 45,
        }}
        renderOption={(option: EuiSelectableOption<IlmOptionData>, searchValue: string) => (
          <>
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            <EuiText size="xs" color="subdued" className="eui-displayBlock">
              <small>
                <EuiHighlight search={searchValue}>{option.phases || ''}</EuiHighlight>
              </small>
            </EuiText>
          </>
        )}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPanel>
  );
}
