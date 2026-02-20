/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  EuiFlyout,
  useGeneratedHtmlId,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import {
  Form,
  UseField,
  UseArray,
  useForm,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';

import {
  createDslStepsFlyoutDeserializer,
  createDslStepsFlyoutSerializer,
  type DslStepsFlyoutFormInternal,
  OnStepFieldErrorsChangeProvider,
  useDslStepsFlyoutTabErrors,
} from './form';
import { DslStepsFlyoutArrayView } from './sections';
import { useStyles } from './use_styles';

export interface EditDslStepsFlyoutProps {
  initialSteps: IngestStreamLifecycleDSL;
  selectedStepIndex: number | undefined;
  setSelectedStepIndex: (index: number | undefined) => void;
  onChange: (next: IngestStreamLifecycleDSL) => void;
  onSave: (next: IngestStreamLifecycleDSL) => void;
  onClose: () => void;
  isSaving?: boolean;
  'data-test-subj'?: string;
}

const FragmentFormWrapper = ({ children }: React.PropsWithChildren) => <>{children}</>;

const UPDATE_FIELD_VALUES_HELPER_META_PATH = '_meta.__dslStepsFlyout';
const UPDATE_FIELD_VALUES_HELPER_META_CONFIG = { defaultValue: true } as const;

export const EditDslStepsFlyout = ({
  initialSteps,
  selectedStepIndex,
  setSelectedStepIndex,
  onChange,
  onSave,
  onClose,
  isSaving,
  'data-test-subj': dataTestSubjProp,
}: EditDslStepsFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsEditDslStepsFlyoutTitle' });
  const dataTestSubj = useMemo(
    () => dataTestSubjProp ?? 'streamsEditDslStepsFlyout',
    [dataTestSubjProp]
  );

  const { footerStyles } = useStyles();

  const initialStepsRef = useRef<IngestStreamLifecycleDSL>(initialSteps);
  const expectedInitialStepsCountRef = useRef<number>(
    initialStepsRef.current.dsl?.downsample?.length ?? 0
  );

  const serializer = useMemo(() => createDslStepsFlyoutSerializer(initialStepsRef.current), []);
  const deserializer = useMemo(() => createDslStepsFlyoutDeserializer(), []);

  const { form } = useForm<IngestStreamLifecycleDSL, DslStepsFlyoutFormInternal>({
    defaultValue: initialStepsRef.current,
    serializer,
    deserializer,
    onSubmit: async (data: IngestStreamLifecycleDSL, isValid: boolean) => {
      if (!isValid) return;
      onSave(data);
    },
  });

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmittedOutputRef = useRef<IngestStreamLifecycleDSL>(initialStepsRef.current);
  const hasInitializedSubscriptionRef = useRef(false);
  const pendingOnChangeOutputRef = useRef<IngestStreamLifecycleDSL | null>(null);
  const pendingOnChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { onStepFieldErrorsChange, tabHasErrors, pruneToStepPaths } = useDslStepsFlyoutTabErrors();

  useEffect(() => {
    const sub = form.subscribe(({ data }) => {
      const next = data.format() as IngestStreamLifecycleDSL;

      if (!hasInitializedSubscriptionRef.current) {
        const expectedCount = expectedInitialStepsCountRef.current;
        if (expectedCount > 0) {
          const fields = form.getFields();
          const areInitialLeafFieldsMounted = Array.from({ length: expectedCount }, (_, index) => {
            return (
              fields[`_meta.downsampleSteps[${index}].afterValue`] &&
              fields[`_meta.downsampleSteps[${index}].afterUnit`] &&
              fields[`_meta.downsampleSteps[${index}].afterToMilliSeconds`] &&
              fields[`_meta.downsampleSteps[${index}].fixedIntervalValue`] &&
              fields[`_meta.downsampleSteps[${index}].fixedIntervalUnit`]
            );
          }).every(Boolean);

          // Avoid emitting an early "blank" serialized DSL before UseArray leaf fields mount.
          if (!areInitialLeafFieldsMounted) return;
        }

        hasInitializedSubscriptionRef.current = true;
      }

      if (isEqual(next, lastEmittedOutputRef.current)) return;

      pendingOnChangeOutputRef.current = next;
      if (pendingOnChangeTimeoutRef.current) {
        clearTimeout(pendingOnChangeTimeoutRef.current);
      }
      pendingOnChangeTimeoutRef.current = setTimeout(() => {
        pendingOnChangeTimeoutRef.current = null;
        const toEmit = pendingOnChangeOutputRef.current;
        pendingOnChangeOutputRef.current = null;
        if (!toEmit) return;
        if (isEqual(toEmit, lastEmittedOutputRef.current)) return;
        lastEmittedOutputRef.current = toEmit;
        onChangeRef.current(toEmit);
      }, 0);
    });

    return () => {
      if (pendingOnChangeTimeoutRef.current) {
        clearTimeout(pendingOnChangeTimeoutRef.current);
        pendingOnChangeTimeoutRef.current = null;
      }
      pendingOnChangeOutputRef.current = null;
      sub.unsubscribe();
    };
  }, [form]);

  return (
    <EuiFlyout
      type="push"
      size="s"
      paddingSize="none"
      ownFocus={false}
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj={dataTestSubj}
    >
      <Form form={form} FormWrapper={FragmentFormWrapper}>
        <OnStepFieldErrorsChangeProvider value={onStepFieldErrorsChange}>
          <UseField
            path={UPDATE_FIELD_VALUES_HELPER_META_PATH}
            config={UPDATE_FIELD_VALUES_HELPER_META_CONFIG}
            readDefaultValueOnForm={false}
          >
            {() => null}
          </UseField>
          <UseArray path="_meta.downsampleSteps" initialNumberOfItems={0}>
            {(arrayField) => (
              <DslStepsFlyoutArrayView
                arrayField={arrayField}
                flyoutTitleId={flyoutTitleId}
                dataTestSubj={dataTestSubj}
                selectedStepIndex={selectedStepIndex}
                setSelectedStepIndex={setSelectedStepIndex}
                tabHasErrors={tabHasErrors}
                pruneToStepPaths={pruneToStepPaths}
              />
            )}
          </UseArray>
        </OnStepFieldErrorsChangeProvider>
      </Form>

      <EuiFlyoutFooter>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={footerStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}CancelButton`}
              onClick={onClose}
              flush="left"
            >
              {i18n.translate('xpack.streams.editDslStepsFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={Boolean(isSaving) || form.isSubmitting}
              data-test-subj={`${dataTestSubj}SaveButton`}
              onClick={() => form.submit()}
              disabled={(form.isSubmitted && form.isValid === false) || form.isSubmitting}
            >
              {i18n.translate('xpack.streams.editDslStepsFlyout.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
