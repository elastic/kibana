/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Phases, PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiHighlight,
  EuiPanel,
  EuiSelectable,
  EuiText,
  EuiHealth,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { getFormattedError } from '../../../../../util/errors';

interface PhaseProps {
  description: string;
  color: string;
}

interface IlmOptionData {
  phases?: PhaseProps[];
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
  const { euiTheme } = useEuiTheme();
  const [selectedPolicy, setSelectedPolicy] = useState(
    isIlmLifecycle(initialValue) ? initialValue.ilm?.policy : undefined
  );
  const [policies, setPolicies] = useState<Array<EuiSelectableOption<IlmOptionData>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    setSelectedPolicy(isIlmLifecycle(initialValue) ? initialValue.ilm?.policy : undefined);
  }, [initialValue]);

  const isBorealis = euiTheme.themeName === 'EUI_THEME_BOREALIS';
  const phaseToIndicatorColors = {
    hot: isBorealis ? euiTheme.colors.vis.euiColorVis6 : euiTheme.colors.vis.euiColorVis9,
    warm: isBorealis ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.vis.euiColorVis5,
    cold: isBorealis ? euiTheme.colors.vis.euiColorVis2 : euiTheme.colors.vis.euiColorVis1,
    frozen: euiTheme.colors.vis.euiColorVis4,
  };

  useEffect(() => {
    const phasesDescription = (phases: Phases) => {
      const desc: PhaseProps[] = [];
      let previosStartAge: string | undefined;
      if (phases.delete) {
        previosStartAge = phases.delete.min_age;
      }
      if (phases.frozen) {
        desc.push({
          description: i18n.translate('xpack.streams.phases.frozen', {
            defaultMessage:
              'Frozen {previosStartAge, select, undefined {forever} other {till {previosStartAge}}}',
            values: { previosStartAge },
          }),
          color: phaseToIndicatorColors.frozen,
        });
        previosStartAge = phases.frozen.min_age ?? previosStartAge;
      }
      if (phases.cold) {
        desc.push({
          description: i18n.translate('xpack.streams.phases.cold', {
            defaultMessage:
              'Cold {previosStartAge, select, undefined {forever} other {till {previosStartAge}}}',
            values: { previosStartAge },
          }),
          color: phaseToIndicatorColors.cold,
        });
        previosStartAge = phases.cold.min_age ?? previosStartAge;
      }
      if (phases.warm) {
        desc.push({
          description: i18n.translate('xpack.streams.phases.warm', {
            defaultMessage:
              'Warm {previosStartAge, select, undefined {forever} other {till {previosStartAge}}}',
            values: { previosStartAge },
          }),
          color: phaseToIndicatorColors.warm,
        });
        previosStartAge = phases.warm.min_age ?? previosStartAge;
      }
      if (phases.hot) {
        desc.push({
          description: i18n.translate('xpack.streams.phases.hot', {
            defaultMessage:
              'Hot {previosStartAge, select, undefined {forever} other {till {previosStartAge}}}',
            values: { previosStartAge },
          }),
          color: phaseToIndicatorColors.hot,
        });
        previosStartAge = phases.hot.min_age ?? previosStartAge;
      }

      return desc.reverse();
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
              <EuiFlexGroup gutterSize="s" alignItems="center" direction="row" responsive={false}>
                {initialPolicyOption.data?.phases?.map((phase: PhaseProps, idx: number) => (
                  <EuiFlexItem key={idx} grow={false}>
                    <EuiHealth textSize="xs" color={phase.color}>
                      {phase.description}
                    </EuiHealth>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
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
              <EuiFlexGroup gutterSize="s" alignItems="center" direction="row" responsive={false}>
                {option.phases?.map((phase: PhaseProps, idx: number) => (
                  <EuiFlexItem key={idx} grow={false}>
                    <EuiHealth textSize="xs" color={phase.color}>
                      {phase.description}
                    </EuiHealth>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
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
