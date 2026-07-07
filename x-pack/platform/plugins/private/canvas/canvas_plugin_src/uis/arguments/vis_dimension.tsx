/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { EuiSelectProps } from '@elastic/eui';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn, ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';
import type { ResolvedArgProps, ResolvedColumns } from '../../../public/expression_types/arg';

const { VisDimension: strings } = ArgumentStrings;

type VisDimensionArgInputProps = {
  onValueChange: (value: ExpressionAstExpression | string) => void;
  argValue: ExpressionAstExpression;
  typeInstance: {
    options?: {
      confirm?: string;
    };
  };
} & ResolvedArgProps<ResolvedColumns>;

const VisDimensionArgInput: React.FC<VisDimensionArgInputProps> = ({
  argValue,
  typeInstance,
  onValueChange,
  resolved: { columns },
}) => {
  const [value, setValue] = useState<ExpressionAstExpression | string>(argValue);
  const confirm = typeInstance?.options?.confirm;

  useEffect(() => {
    setValue(argValue);
  }, [argValue]);

  const onChange = useCallback<NonNullable<EuiSelectProps['onChange']>>(
    (ev) => {
      const onChangeFn = confirm ? setValue : onValueChange;
      const astObj: ExpressionAstExpression = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'visdimension',
            arguments: {
              _: [ev.target.value],
            },
          },
        ],
      };

      onChangeFn(typeof value === 'string' ? ev.target.value : astObj);
    },
    [confirm, onValueChange, value]
  );

  const options = [
    { value: '', text: strings.getDefaultOptionName(), disabled: true },
    ...columns.map((column: DatatableColumn) => ({ value: column.id, text: column.name })),
  ];

  const selectedValue =
    typeof value === 'string'
      ? value
      : value.chain[0].arguments._?.[0] ?? value.chain[0].arguments.accessor?.[0];

  const columnId =
    typeof selectedValue === 'number'
      ? columns[selectedValue]?.id || ''
      : columns.find(({ id }) => id === selectedValue)?.id || '';

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem>
        <EuiSelect
          compressed
          options={options}
          value={columnId}
          onChange={onChange}
          aria-label={i18n.translate(
            'xpack.canvas.visDimensionArgInput.dimensionSelect.ariaLabel',
            {
              defaultMessage: 'Dimension',
            }
          )}
        />
      </EuiFlexItem>
      {confirm && (
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => onValueChange(value)}>
            {confirm}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const visdimension = () => ({
  name: 'vis_dimension',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(VisDimensionArgInput),
});
