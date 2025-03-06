/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { nonNullable } from '../../../utils';
import {
  operationDefinitionMap,
  type PercentileIndexPatternColumn,
  type PercentileRanksIndexPatternColumn,
  type TermsIndexPatternColumn,
} from '../operations';
import { isColumnOfType } from '../operations/definitions/helpers';
import { FormBasedLayer } from '../types';
import { MAX_TERMS_OTHER_ENABLED } from '../operations/definitions/terms/constants';

export const formulaOperationName = 'formula';
export const staticValueOperationName = 'static_value';
export const quickFunctionsName = 'quickFunctions';
export const termsOperationName = 'terms';
export const optionallySortableOperationNames = ['percentile', 'percentile_ranks'];
export const nonQuickFunctions = new Set([formulaOperationName, staticValueOperationName]);

export type TemporaryState = typeof quickFunctionsName | typeof staticValueOperationName | 'none';

export function isLayerChangingDueToOtherBucketChange(
  prevLayer: FormBasedLayer,
  newLayer: FormBasedLayer
) {
  // Finds the other bucket in prevState and return its value
  const prevStateTermsColumns = Object.entries(prevLayer.columns)
    .map(([id, column]) => {
      if (isColumnOfType<TermsIndexPatternColumn>('terms', column)) {
        return { id, otherBucket: column.params.otherBucket, termsSize: column.params.size };
      }
    })
    .filter(nonNullable);
  // Checks if the terms columns have changed the otherBucket value programatically.
  // This happens when the terms size is greater than equal MAX_TERMS_OTHER_ENABLED
  // and the previous state terms size is lower than MAX_TERMS_OTHER_ENABLED
  const hasChangedOtherBucket = prevStateTermsColumns.some(({ id, otherBucket, termsSize }) => {
    const newStateTermsColumn = newLayer.columns[id];
    if (!isColumnOfType<TermsIndexPatternColumn>('terms', newStateTermsColumn)) {
      return false;
    }

    return (
      newStateTermsColumn.params.otherBucket !== otherBucket &&
      !newStateTermsColumn.params.otherBucket &&
      newStateTermsColumn.params.size >= MAX_TERMS_OTHER_ENABLED &&
      termsSize < MAX_TERMS_OTHER_ENABLED
    );
  });
  return hasChangedOtherBucket;
}

export function isLayerChangingDueToDecimalsPercentile(
  prevLayer: FormBasedLayer,
  newLayer: FormBasedLayer
) {
  // step 1: find the ranking column in prevState and return its value
  const termsRiskyColumns = Object.entries(prevLayer.columns)
    .map(([id, column]) => {
      if (
        isColumnOfType<TermsIndexPatternColumn>('terms', column) &&
        column.params?.orderBy.type === 'column' &&
        column.params.orderBy.columnId != null
      ) {
        const rankingColumn = prevLayer.columns[column.params.orderBy.columnId];
        if (isColumnOfType<PercentileIndexPatternColumn>('percentile', rankingColumn)) {
          if (Number.isInteger(rankingColumn.params.percentile)) {
            return { id, rankId: column.params.orderBy.columnId };
          }
        }
        if (isColumnOfType<PercentileRanksIndexPatternColumn>('percentile_rank', rankingColumn)) {
          if (Number.isInteger(rankingColumn.params.value)) {
            return { id, rankId: column.params.orderBy.columnId };
          }
        }
      }
    })
    .filter(nonNullable);
  // now check again the terms risky column in the new layer and verify that at
  // least one changed due to decimals
  const hasChangedDueToDecimals = termsRiskyColumns.some(({ id, rankId }) => {
    const termsColumn = newLayer.columns[id];
    if (!isColumnOfType<TermsIndexPatternColumn>('terms', termsColumn)) {
      return false;
    }
    if (termsColumn.params.orderBy.type === 'alphabetical') {
      const rankingColumn = newLayer.columns[rankId];
      if (isColumnOfType<PercentileIndexPatternColumn>('percentile', rankingColumn)) {
        return !Number.isInteger(rankingColumn.params.percentile);
      }
      if (isColumnOfType<PercentileRanksIndexPatternColumn>('percentile_rank', rankingColumn)) {
        return !Number.isInteger(rankingColumn.params.value);
      }
    }
  });
  return hasChangedDueToDecimals;
}

export function isQuickFunction(operationType: string) {
  return !nonQuickFunctions.has(operationType);
}

export function getParamEditor(
  temporaryStaticValue: boolean,
  selectedOperationDefinition: (typeof operationDefinitionMap)[string] | undefined,
  showDefaultStaticValue: boolean
) {
  if (temporaryStaticValue) {
    return operationDefinitionMap[staticValueOperationName].paramEditor;
  }
  if (selectedOperationDefinition?.paramEditor) {
    return selectedOperationDefinition.paramEditor;
  }
  if (showDefaultStaticValue) {
    return operationDefinitionMap[staticValueOperationName].paramEditor;
  }
  return null;
}

export const CalloutWarning = ({
  currentOperationType,
  temporaryStateType,
}: {
  currentOperationType: keyof typeof operationDefinitionMap | undefined;
  temporaryStateType: TemporaryState;
}) => {
  if (
    temporaryStateType === 'none' ||
    (currentOperationType != null && isQuickFunction(currentOperationType))
  ) {
    return null;
  }
  if (
    currentOperationType === staticValueOperationName &&
    temporaryStateType === 'quickFunctions'
  ) {
    return (
      <>
        <EuiCallOut
          className="lnsIndexPatternDimensionEditor__warning"
          size="s"
          title={i18n.translate('xpack.lens.indexPattern.staticValueWarning', {
            defaultMessage: 'Static value currently applied',
          })}
          iconType="warning"
          color="warning"
        >
          <p>
            {i18n.translate('xpack.lens.indexPattern.staticValueWarningText', {
              defaultMessage: 'To overwrite your static value, select a quick function',
            })}
          </p>
        </EuiCallOut>
      </>
    );
  }
  return (
    <>
      <EuiCallOut
        className="lnsIndexPatternDimensionEditor__warning"
        size="s"
        title={i18n.translate('xpack.lens.indexPattern.formulaWarning', {
          defaultMessage: 'Formula currently applied',
        })}
        iconType="warning"
        color="warning"
      >
        {temporaryStateType !== 'quickFunctions' ? (
          <p>
            {i18n.translate('xpack.lens.indexPattern.formulaWarningStaticValueText', {
              defaultMessage: 'To overwrite your formula, change the value in the input field',
            })}
          </p>
        ) : (
          <p>
            {i18n.translate('xpack.lens.indexPattern.formulaWarningText', {
              defaultMessage: 'To overwrite your formula, select a quick function',
            })}
          </p>
        )}
      </EuiCallOut>
    </>
  );
};

export interface DimensionEditorGroupsOptions {
  enabled: boolean;
  state: boolean;
  onClick: () => void;
  id: typeof quickFunctionsName | typeof staticValueOperationName | typeof formulaOperationName;
  label: string;
}

export const DimensionEditorButtonGroups = ({
  options,
  onMethodChange,
  selectedMethod,
}: {
  options: DimensionEditorGroupsOptions[];
  onMethodChange: (id: string) => void;
  selectedMethod: string;
}) => {
  const enabledGroups = options.filter(({ enabled }) => enabled);
  const groups = enabledGroups.map(({ id, label }) => {
    return {
      id,
      label,
      'data-test-subj': `lens-dimensionTabs-${id}`,
    };
  });

  const onChange = (optionId: string) => {
    onMethodChange(optionId);
    const selectedOption = options.find(({ id }) => id === optionId);
    selectedOption?.onClick();
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingMethod', {
        defaultMessage: 'Method',
      })}
      fullWidth
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.indexPattern.dimensionEditorModes', {
          defaultMessage: 'Dimension editor configuration modes',
        })}
        buttonSize="compressed"
        isFullWidth
        options={groups}
        idSelected={selectedMethod}
        onChange={(id) => onChange(id)}
      />
    </EuiFormRow>
  );
};
