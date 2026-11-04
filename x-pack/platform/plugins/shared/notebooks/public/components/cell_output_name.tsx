/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CellDefinition } from '../../common/types';
import { renameOutput, type CellOutput } from '../model/references';
import { useNotebook } from './notebook_context';

const getDescription = ({ key, name, isFixed }: CellOutput): string => {
  switch (key) {
    case 'table':
      return i18n.translate('xpack.notebook.output.tableDescription', {
        defaultMessage: 'The results of this query. Charts and dropdowns can use them as data.',
      });
    case 'value':
      return i18n.translate('xpack.notebook.output.valueDescription', {
        defaultMessage: 'The selected value. Use it in a query as ?{name}.',
        values: { name },
      });
    case 'start':
      return isFixed
        ? i18n.translate('xpack.notebook.output.globalStartDescription', {
            defaultMessage: 'The start of the global time range. Use it in a query as ?{name}.',
            values: { name },
          })
        : i18n.translate('xpack.notebook.output.startDescription', {
            defaultMessage: 'The start of the time range. Use it in a query as ?{name}.',
            values: { name },
          });
    case 'end':
      return isFixed
        ? i18n.translate('xpack.notebook.output.globalEndDescription', {
            defaultMessage: 'The end of the global time range. Use it in a query as ?{name}.',
            values: { name },
          })
        : i18n.translate('xpack.notebook.output.endDescription', {
            defaultMessage: 'The end of the time range. Use it in a query as ?{name}.',
            values: { name },
          });
    case 'min':
      return i18n.translate('xpack.notebook.output.minDescription', {
        defaultMessage: 'The lower bound of the selected range. Use it in a query as ?{name}.',
        values: { name },
      });
    case 'max':
      return i18n.translate('xpack.notebook.output.maxDescription', {
        defaultMessage: 'The upper bound of the selected range. Use it in a query as ?{name}.',
        values: { name },
      });
  }
};

/** One output in the cell footer, renamable in place, with a tooltip saying what it holds. */
export const CellOutputName = ({ cell, output }: { cell: CellDefinition; output: CellOutput }) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const codeFont = css`
    font-family: ${euiTheme.font.familyCode};
  `;
  const [error, setError] = useState<string>();
  const { key, name, isParam, isFixed } = output;
  const description = getDescription(output);
  const prefix = isParam ? '?' : undefined;

  if (isFixed) {
    return (
      <EuiToolTip content={description}>
        <EuiCode tabIndex={0} data-test-subj={`notebookCellOutput-${key}`}>
          {`?${name}`}
        </EuiCode>
      </EuiToolTip>
    );
  }

  const save = (value: string): boolean => {
    const result = renameOutput(store.cells$.getValue(), cell, key, value.trim());
    if ('error' in result) {
      setError(result.error);
      return false;
    }
    setError(undefined);
    store.updateCell(cell.id, () => result.cell);
    return true;
  };

  return (
    <EuiToolTip content={description} disableScreenReaderOutput>
      <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
        {prefix && (
          <EuiFlexItem grow={false} css={codeFont}>
            {prefix}
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiInlineEditText
            key={name}
            size="xs"
            inputAriaLabel={i18n.translate('xpack.notebook.output.nameAriaLabel', {
              defaultMessage: 'Output name. {description}',
              values: { description },
            })}
            defaultValue={name}
            onSave={save}
            onCancel={() => setError(undefined)}
            isInvalid={error !== undefined}
            editModeProps={{
              formRowProps: { error },
              inputProps: { prepend: prefix, onChange: () => setError(undefined) },
            }}
            readModeProps={{ color: 'text', css: codeFont }}
            data-test-subj={`notebookCellOutput-${key}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
