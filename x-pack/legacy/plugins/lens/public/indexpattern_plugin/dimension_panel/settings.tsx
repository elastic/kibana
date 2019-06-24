/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSideNav,
  EuiCallOut,
  EuiButton,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';
import classNames from 'classnames';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import { operationDefinitionMap, getOperations, getOperationDisplay } from '../operations';
import { hasField, getColumnOrder, deleteColumn, changeColumn } from '../state_helpers';
import { FieldSelect } from './field_select';

export interface SettingsProps extends IndexPatternDimensionPanelProps {
  selectedColumn?: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
}

export function Settings(props: SettingsProps) {
  const { selectedColumn, filteredColumns, state, columnId, setState } = props;
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [invalidOperationType, setInvalidOperationType] = useState<OperationType | null>(null);
  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;
  const possibleOperationTypes = filteredColumns.map(col => col.operationType);
  const operations = getOperations().filter(op => possibleOperationTypes.includes(op));
  const operationPanels = getOperationDisplay();
  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return (
          (!hasField(selectedColumn) && !hasField(col)) ||
          (hasField(selectedColumn) &&
            hasField(col) &&
            col.sourceField === selectedColumn.sourceField)
        );
      })
    : filteredColumns;

  const supportedOperations = operations.filter(op =>
    functionsFromField.some(col => col.operationType === op)
  );

  const unsupportedOperations = operations.filter(
    op => !functionsFromField.some(col => col.operationType === op)
  );

  function operationNavItem(op: OperationType) {
    return {
      name: operationPanels[op].displayName,
      id: op as string,
      className: classNames('lnsConfigPanel__operation', {
        'lnsConfigPanel__operation--selected': Boolean(
          invalidOperationType === op ||
            (!invalidOperationType && selectedColumn && selectedColumn.operationType === op)
        ),
        'lnsConfigPanel__operation--unsupported': !functionsFromField.some(
          col => col.operationType === op
        ),
      }),
      onClick() {
        if (!selectedColumn || !functionsFromField.some(col => col.operationType === op)) {
          setInvalidOperationType(op);
          return;
        }
        if (invalidOperationType) {
          setInvalidOperationType(null);
        }
        if (selectedColumn.operationType === op) {
          return;
        }
        const newColumn: IndexPatternColumn = filteredColumns.find(
          col =>
            col.operationType === op &&
            (!('sourceField' in col) ||
              !('sourceField' in selectedColumn) ||
              col.sourceField === selectedColumn.sourceField)
        )!;

        const newColumns = {
          ...state.columns,
          [columnId]: newColumn,
        };

        setState({
          ...state,
          columnOrder: getColumnOrder(newColumns),
          columns: newColumns,
        });
      },
    };
  }

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: supportedOperations
        .map(operationNavItem)
        .concat(unsupportedOperations.map(operationNavItem)),
    },
  ];

  return (
    <EuiPopover
      id={columnId}
      className="lnsConfigPanel__summaryPopover"
      anchorClassName="lnsConfigPanel__summaryPopoverAnchor"
      button={
        <EuiLink
          className="lnsConfigPanel__summaryLink"
          onClick={() => {
            setSettingsOpen(true);
          }}
        >
          {selectedColumn
            ? selectedColumn.label
            : i18n.translate('xpack.lens.indexPattern.configureDimensionLabel', {
                defaultMessage: 'Configure dimension',
              })}
        </EuiLink>
      }
      isOpen={isSettingsOpen}
      closePopover={() => {
        setSettingsOpen(false);
        setInvalidOperationType(null);
      }}
      anchorPosition="leftUp"
      withTitle
      panelPaddingSize="s"
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          <FieldSelect
            {...props}
            invalidOperationType={invalidOperationType}
            onDeleteColumn={() => {
              setState(deleteColumn(state, columnId));
            }}
            onChangeColumn={column => {
              setState(changeColumn(state, columnId, column));
              setInvalidOperationType(null);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={null} className={classNames('lnsConfigPanel__summaryPopoverLeft')}>
              <EuiSideNav items={sideNavItems} />
            </EuiFlexItem>
            <EuiFlexItem grow={true} className="lnsConfigPanel__summaryPopoverRight">
              {invalidOperationType && selectedColumn && (
                <EuiCallOut
                  title="Operation not applicable to field"
                  color="danger"
                  iconType="cross"
                >
                  <p>Please choose another field</p>
                </EuiCallOut>
              )}
              {!invalidOperationType && ParamEditor && (
                <ParamEditor state={state} setState={setState} columnId={columnId} />
              )}
              {!invalidOperationType && selectedColumn && (
                <EuiFormRow label="Label">
                  <EuiFieldText
                    value={selectedColumn.label}
                    onChange={e => {
                      setState(
                        changeColumn(state, columnId, {
                          ...selectedColumn,
                          label: e.target.value,
                        })
                      );
                    }}
                  />
                </EuiFormRow>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
