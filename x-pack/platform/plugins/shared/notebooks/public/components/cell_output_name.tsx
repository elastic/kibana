/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CellDefinition } from '../../common/types';
import { renameOutput, type CellOutput } from '../model/references';
import { useNotebook } from './notebook_context';

const getDescription = ({ key, isFixed }: CellOutput): string | undefined => {
  switch (key) {
    case 'table':
      return i18n.translate('xpack.notebook.output.tableDescription', {
        defaultMessage: 'The results of this query. Charts and dropdowns can use them as data.',
      });
    case 'value':
      return i18n.translate('xpack.notebook.output.valueDescription', {
        defaultMessage: 'The selected value.',
      });
    case 'start':
      return isFixed
        ? i18n.translate('xpack.notebook.output.globalStartDescription', {
            defaultMessage: 'The start of the global time range.',
          })
        : i18n.translate('xpack.notebook.output.startDescription', {
            defaultMessage: 'The start of the time range.',
          });
    case 'end':
      return isFixed
        ? i18n.translate('xpack.notebook.output.globalEndDescription', {
            defaultMessage: 'The end of the global time range.',
          })
        : i18n.translate('xpack.notebook.output.endDescription', {
            defaultMessage: 'The end of the time range.',
          });
    case 'min':
      return i18n.translate('xpack.notebook.output.minDescription', {
        defaultMessage: 'The lower bound of the selected range.',
      });
    case 'max':
      return i18n.translate('xpack.notebook.output.maxDescription', {
        defaultMessage: 'The upper bound of the selected range.',
      });
    default:
      return undefined;
  }
};

/** One output in the cell footer, renamable in place, with a tooltip saying what it holds when that is known. */
export const CellOutputName = ({ cell, output }: { cell: CellDefinition; output: CellOutput }) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState<string>();
  const { key, name, isFixed } = output;
  const description = getDescription(output);
  const testSubj = `notebookCellOutput-${key}`;

  if (isFixed) {
    if (!description) return <EuiCode data-test-subj={testSubj}>{name}</EuiCode>;
    return (
      <EuiToolTip content={description}>
        <EuiCode tabIndex={0} data-test-subj={testSubj}>
          {name}
        </EuiCode>
      </EuiToolTip>
    );
  }

  const stopEditing = () => {
    setDraft(undefined);
    setError(undefined);
  };

  const save = (value: string, { keepOpenOnError }: { keepOpenOnError: boolean }) => {
    const result = renameOutput(store.cells$.getValue(), cell, key, value.trim());
    if ('error' in result) {
      if (keepOpenOnError) setError(result.error);
      else stopEditing();
      return;
    }
    store.setCells(result.cells);
    stopEditing();
  };

  if (draft !== undefined) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <input
            type="text"
            autoFocus
            spellCheck={false}
            value={draft}
            aria-invalid={error !== undefined}
            aria-label={i18n.translate('xpack.notebook.output.nameAriaLabel', {
              defaultMessage: 'Output name. {description}',
              values: { description },
            })}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save(draft, { keepOpenOnError: true });
              if (event.key === 'Escape') {
                event.stopPropagation();
                stopEditing();
              }
            }}
            onBlur={() => save(draft, { keepOpenOnError: false })}
            css={css`
              box-sizing: content-box;
              width: ${Math.max(draft.length, 1) + 1}ch;
              margin: 0;
              padding: 0.2em 0.5em;
              border: none;
              border-radius: ${euiTheme.border.radius.small};
              font-family: ${euiTheme.font.familyCode};
              font-size: 0.9em;
              font-weight: ${euiTheme.font.weight.bold};
              line-height: normal;
              color: ${euiTheme.components.codeInlineColor};
              background-color: ${euiTheme.components.codeInlineBackground};
              outline: ${euiTheme.border.width.thin} solid
                ${error ? euiTheme.colors.danger : euiTheme.colors.primary};
            `}
            data-test-subj={`${testSubj}-input`}
          />
        </EuiFlexItem>
        {error && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="danger" role="alert">
              {error}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiToolTip content={description} disableScreenReaderOutput>
      <button
        type="button"
        onClick={() => setDraft(name)}
        aria-label={i18n.translate('xpack.notebook.output.renameAriaLabel', {
          defaultMessage: 'Rename {name}. {description}',
          values: { name, description },
        })}
        css={css`
          padding: 0;
          border: none;
          background: none;
          cursor: text;
        `}
        data-test-subj={testSubj}
      >
        <EuiCode>{name}</EuiCode>
      </button>
    </EuiToolTip>
  );
};
