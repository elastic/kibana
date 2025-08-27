/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import type { ObservablePost } from '../../../common/types/api';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants/observables';
import * as i18n from '../create/translations';
import { OptionalFieldLabel } from '../optional_field_label';

export interface ObservablesProps {
  isLoading: boolean;
  observables: ObservablePost[];
  selectedObservables: ObservablePost[];
  setObservables: (observables: ObservablePost[]) => void;
}

const getTypeLabel = (typeKey: string) => {
  return OBSERVABLE_TYPES_BUILTIN.find(({ key }) => key === typeKey)?.label;
};

const getTypeKey = (label: string) => {
  return OBSERVABLE_TYPES_BUILTIN.find(({ label: typeLabel }) => typeLabel === label)?.key;
};

/**
 * This component is used to toggle the extract observables feature in the create case flyout.
 * When the toggle is enabled, the observables from the alert are displayed.
 */
const ObservablesComponent: React.FC<ObservablesProps> = ({
  isLoading,
  observables,
  selectedObservables,
  setObservables,
}) => {
  const [{ extractObservables }] = useFormData<{
    extractObservables?: boolean;
  }>({
    watch: ['extractObservables'],
  });

  const options = useMemo(() => {
    return observables.map((observable) => ({
      label: `${getTypeLabel(observable.typeKey)}: ${observable.value}`,
    }));
  }, [observables]);

  const selectedOptions = useMemo(() => {
    return selectedObservables?.map((observable: ObservablePost) => ({
      label: `${getTypeLabel(observable.typeKey)}: ${observable.value}`,
    }));
  }, [selectedObservables]);

  const onChange = (selected: { label: string }[]) => {
    setObservables(
      selected.map((item) => {
        return {
          typeKey: getTypeKey(item.label.split(':')[0]) ?? '',
          value: item.label.split(':')[1].trim(),
          description: null,
        };
      })
    );
  };

  if (!extractObservables || observables.length === 0) {
    return null;
  }

  return (
    <EuiFormRow
      id="caseObservables"
      fullWidth
      label={i18n.EXTRACT_OBSERVABLES_LABEL}
      labelAppend={OptionalFieldLabel}
      data-test-subj="caseObservables"
    >
      <EuiComboBox
        fullWidth
        isLoading={isLoading}
        options={options}
        data-test-subj="caseObservablesComboBox"
        selectedOptions={selectedOptions}
        isDisabled={isLoading}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};

ObservablesComponent.displayName = 'ObservablesComponent';

export const Observables = memo(ObservablesComponent);
