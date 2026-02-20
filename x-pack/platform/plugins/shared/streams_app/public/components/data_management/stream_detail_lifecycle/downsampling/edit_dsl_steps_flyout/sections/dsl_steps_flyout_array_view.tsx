/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormArrayField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import {
  MAX_DOWNSAMPLE_STEPS,
  type DslStepMetaFields,
  type DslStepsFlyoutFormInternal,
  type PreservedTimeUnit,
  toMilliseconds,
} from '../form';
import { TIME_UNIT_OPTIONS } from '../constants';
import { useStyles } from '../use_styles';
import { StepPanel } from './step_panel';
import { StepTabsRow } from './step_tabs_row';

/** Partial form update including internal __dslStepsFlyout flag for updateFieldValues */
type DslStepsFlyoutFormFieldUpdate = Partial<DslStepsFlyoutFormInternal> & {
  _meta?: Partial<DslStepsFlyoutFormInternal['_meta']> & {
    __dslStepsFlyout?: boolean;
    downsampleSteps: DslStepMetaFields[];
  };
};

export interface DslStepsFlyoutArrayViewProps {
  arrayField: FormArrayField;
  flyoutTitleId: string;
  dataTestSubj: string;
  selectedStepIndex: number | undefined;
  setSelectedStepIndex: (index: number | undefined) => void;
  tabHasErrors: (stepPath: string) => boolean;
  pruneToStepPaths: (stepPaths: string[]) => void;
}

export const DslStepsFlyoutArrayView = ({
  arrayField,
  flyoutTitleId,
  dataTestSubj,
  selectedStepIndex,
  setSelectedStepIndex,
  tabHasErrors,
  pruneToStepPaths,
}: DslStepsFlyoutArrayViewProps) => {
  const { items, form } = arrayField;
  const { sectionStyles, headerStyles, headerNoStepsStyles } = useStyles();

  const pendingSelectedStepIndexRef = useRef<number | null>(null);
  const pendingEnsureIndexRef = useRef<number | null>(null);
  const pendingEnsureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCurrentSteps = useCallback((): DslStepMetaFields[] => {
    const fields = form.getFields();

    return Array.from({ length: items.length }, (_, index) => {
      const afterValue = String(fields[`_meta.downsampleSteps[${index}].afterValue`]?.value ?? '');
      const afterUnit = String(
        fields[`_meta.downsampleSteps[${index}].afterUnit`]?.value ?? 'd'
      ) as PreservedTimeUnit;
      const afterToMilliSeconds = Number(
        fields[`_meta.downsampleSteps[${index}].afterToMilliSeconds`]?.value ?? -1
      );
      const fixedIntervalValue = String(
        fields[`_meta.downsampleSteps[${index}].fixedIntervalValue`]?.value ?? '1'
      );
      const fixedIntervalUnit = String(
        fields[`_meta.downsampleSteps[${index}].fixedIntervalUnit`]?.value ?? 'd'
      ) as PreservedTimeUnit;

      return {
        afterValue,
        afterUnit,
        afterToMilliSeconds,
        fixedIntervalValue,
        fixedIntervalUnit,
      };
    });
  }, [form, items.length]);

  const clampStepIndex = useCallback((index: number): number => {
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.min(index, MAX_DOWNSAMPLE_STEPS - 1));
  }, []);

  const createNextStepFromPrevious = useCallback(
    (previousStep?: DslStepMetaFields): DslStepMetaFields => {
      if (previousStep === undefined) {
        return {
          afterValue: '',
          afterUnit: 'd',
          afterToMilliSeconds: -1,
          fixedIntervalValue: '1',
          fixedIntervalUnit: 'd',
        };
      }

      const previousAfterUnit = previousStep.afterUnit ?? 'd';
      const previousAfterNum = Number(previousStep.afterValue);
      const safePreviousAfterNum =
        Number.isFinite(previousAfterNum) && previousAfterNum >= 0 ? previousAfterNum : 0;
      const nextAfterValue = String(safePreviousAfterNum * 2);
      const nextAfterMs = toMilliseconds(nextAfterValue, previousAfterUnit);

      const previousFixedUnit = previousStep.fixedIntervalUnit ?? 'd';
      const previousFixedNum = Number(previousStep.fixedIntervalValue);
      const safePreviousFixedNum =
        Number.isFinite(previousFixedNum) && previousFixedNum > 0 ? previousFixedNum : 1;
      const nextFixedIntervalValue = String(safePreviousFixedNum * 2);

      return {
        afterValue: nextAfterValue,
        afterUnit: previousAfterUnit,
        afterToMilliSeconds: Number.isFinite(nextAfterMs) ? nextAfterMs : -1,
        fixedIntervalValue: nextFixedIntervalValue,
        fixedIntervalUnit: previousFixedUnit,
      };
    },
    []
  );

  const ensureStepExistsWithDefaults = useCallback(
    (targetIndex: number) => {
      const clampedIndex = clampStepIndex(targetIndex);
      if (clampedIndex !== targetIndex) {
        setSelectedStepIndex(clampedIndex);
        return;
      }

      if (items.length >= clampedIndex + 1) return;

      pendingSelectedStepIndexRef.current = clampedIndex;

      const currentSteps = getCurrentSteps();
      const nextSteps = [...currentSteps];
      while (nextSteps.length < clampedIndex + 1) {
        nextSteps.push(createNextStepFromPrevious(nextSteps[nextSteps.length - 1]));
      }

      const payload: DslStepsFlyoutFormFieldUpdate = {
        _meta: { __dslStepsFlyout: true, downsampleSteps: nextSteps },
      };
      form.updateFieldValues(payload, { runDeserializer: false });
    },
    [
      clampStepIndex,
      createNextStepFromPrevious,
      form,
      getCurrentSteps,
      items.length,
      setSelectedStepIndex,
    ]
  );

  const scheduleEnsureStepExistsWithDefaults = useCallback(
    (targetIndex: number) => {
      pendingEnsureIndexRef.current = targetIndex;
      if (pendingEnsureTimeoutRef.current) return;

      pendingEnsureTimeoutRef.current = setTimeout(() => {
        pendingEnsureTimeoutRef.current = null;
        const index = pendingEnsureIndexRef.current;
        pendingEnsureIndexRef.current = null;
        if (index === null) return;
        ensureStepExistsWithDefaults(index);
      }, 0);
    },
    [ensureStepExistsWithDefaults]
  );

  useEffect(() => {
    pruneToStepPaths(items.map((i) => i.path));
  }, [items, pruneToStepPaths]);

  useEffect(() => {
    if (items.length === 0) {
      // Allow controlled selection to act as an external "add step & select it" request.
      if (selectedStepIndex !== undefined) {
        if (pendingSelectedStepIndexRef.current === selectedStepIndex) return;
        scheduleEnsureStepExistsWithDefaults(selectedStepIndex);
      } else {
        pendingSelectedStepIndexRef.current = null;
      }
      return;
    }

    if (
      pendingSelectedStepIndexRef.current !== null &&
      pendingSelectedStepIndexRef.current < items.length
    ) {
      pendingSelectedStepIndexRef.current = null;
    }

    if (selectedStepIndex === undefined) {
      setSelectedStepIndex(0);
      return;
    }

    const clamped = clampStepIndex(selectedStepIndex);
    if (clamped !== selectedStepIndex) {
      setSelectedStepIndex(clamped);
      return;
    }

    if (selectedStepIndex >= items.length) {
      if (pendingSelectedStepIndexRef.current === selectedStepIndex) return;
      scheduleEnsureStepExistsWithDefaults(selectedStepIndex);
    }
  }, [
    clampStepIndex,
    ensureStepExistsWithDefaults,
    items.length,
    selectedStepIndex,
    scheduleEnsureStepExistsWithDefaults,
    setSelectedStepIndex,
  ]);

  useEffect(() => {
    return () => {
      if (pendingEnsureTimeoutRef.current) {
        clearTimeout(pendingEnsureTimeoutRef.current);
        pendingEnsureTimeoutRef.current = null;
      }
      pendingEnsureIndexRef.current = null;
    };
  }, []);

  const addStep = useCallback(() => {
    if (items.length >= MAX_DOWNSAMPLE_STEPS) return;

    const nextIndex = items.length;
    pendingSelectedStepIndexRef.current = nextIndex;

    const currentSteps = getCurrentSteps();
    const previousStep = currentSteps[currentSteps.length - 1];

    const nextStep = createNextStepFromPrevious(previousStep);

    const nextSteps: DslStepMetaFields[] = [...currentSteps, nextStep];
    const payload: DslStepsFlyoutFormFieldUpdate = {
      _meta: { __dslStepsFlyout: true, downsampleSteps: nextSteps },
    };
    form.updateFieldValues(payload, { runDeserializer: false });
    setSelectedStepIndex(nextIndex);
  }, [createNextStepFromPrevious, form, getCurrentSteps, items.length, setSelectedStepIndex]);

  const removeStep = useCallback(
    (stepIndex: number) => {
      const oldLength = items.length;

      const nextSteps = getCurrentSteps().filter((_, index) => index !== stepIndex);
      const payload: DslStepsFlyoutFormFieldUpdate = {
        _meta: { __dslStepsFlyout: true, downsampleSteps: nextSteps },
      };
      form.updateFieldValues(payload, { runDeserializer: false });

      if (selectedStepIndex === undefined) return;
      const newLength = oldLength - 1;
      if (newLength <= 0) {
        setSelectedStepIndex(undefined);
        return;
      }

      if (stepIndex < selectedStepIndex) {
        setSelectedStepIndex(selectedStepIndex - 1);
        return;
      }

      if (stepIndex === selectedStepIndex) {
        setSelectedStepIndex(Math.min(selectedStepIndex, newLength - 1));
      }
    },
    [form, getCurrentSteps, items.length, selectedStepIndex, setSelectedStepIndex]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          responsive={false}
          css={[headerStyles, items.length === 0 && headerNoStepsStyles]}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                {i18n.translate('xpack.streams.editDslStepsFlyout.title', {
                  defaultMessage: 'Edit downsampling steps',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {items.length > 0 && (
            <EuiFlexItem grow={false}>
              <StepTabsRow
                items={items}
                selectedStepIndex={selectedStepIndex}
                setSelectedStepIndex={setSelectedStepIndex}
                onAddStep={addStep}
                isAddDisabled={items.length >= MAX_DOWNSAMPLE_STEPS}
                tabHasErrors={tabHasErrors}
                dataTestSubj={dataTestSubj}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {items.length === 0 ? (
          <div css={sectionStyles}>
            <EuiEmptyPrompt
              title={
                <EuiText size="s">
                  <h3>
                    {i18n.translate('xpack.streams.editDslStepsFlyout.noStepsTitle', {
                      defaultMessage: 'No downsampling configured',
                    })}
                  </h3>
                </EuiText>
              }
              body={
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.streams.editDslStepsFlyout.noStepsBody', {
                      defaultMessage:
                        'You have no downsample steps. Add a new step or save to disable downsampling.',
                    })}
                  </p>
                </EuiText>
              }
              actions={[
                <EuiButton
                  size="s"
                  data-test-subj={`${dataTestSubj}EmptyStateAddStepButton`}
                  onClick={addStep}
                >
                  {i18n.translate('xpack.streams.editDslStepsFlyout.addStepEmptyState', {
                    defaultMessage: 'Add downsample step',
                  })}
                </EuiButton>,
              ]}
            />
          </div>
        ) : (
          items.map((item, index) => (
            <StepPanel
              key={item.id}
              item={item}
              stepIndex={index}
              selectedStepIndex={selectedStepIndex}
              onRemoveStep={removeStep}
              dataTestSubj={dataTestSubj}
              timeUnitOptions={TIME_UNIT_OPTIONS}
            />
          ))
        )}
      </EuiFlyoutBody>
    </>
  );
};
