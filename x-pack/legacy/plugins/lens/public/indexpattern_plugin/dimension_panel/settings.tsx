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
  EuiButtonIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSideNav,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';
import classNames from 'classnames';
import { IndexPatternColumn, OperationType, FieldBasedIndexPatternColumn } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import { operationDefinitionMap, getOperations, getOperationDisplay } from '../operations';
import { hasField, getColumnOrder } from '../state_helpers';
import { FieldSelect } from './field_select';

export interface SettingsProps extends IndexPatternDimensionPanelProps {
  selectedColumn: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
}

export function Settings(props: SettingsProps) {
  // TODO kill internal state when closing settings
  const { selectedColumn, filteredColumns, state, columnId, setState } = props;
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [invalidOperationType, setInvalidOperationType] = useState<OperationType | null>(null);
  // TODO remove this
  const [showAllOptions, setShowAllOptions] = useState(false);
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
      className: classNames({
        'lnsConfigPanel__operation--selected': Boolean(
          invalidOperationType === op ||
            (!invalidOperationType && selectedColumn && selectedColumn.operationType === op)
        ),
      }),
      onClick() {
        if (!functionsFromField.some(col => col.operationType === op)) {
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
      items: supportedOperations.map(operationNavItem),
    },
  ];

  if (showAllOptions) {
    sideNavItems.push({
      name: 'Additional options',
      id: '2',
      items: unsupportedOperations.map(operationNavItem),
    });
  } else {
    sideNavItems.push({
      name: '',
      id: '1',
      items: [
        {
          name: 'Show all options',
          id: 'additional_options',
          className: 'lnsConfigPanel__operation--action',
          onClick: () => {
            setShowAllOptions(true);
          },
        },
      ],
    });
  }

  const fieldColumns = filteredColumns.filter(
    col =>
      'sourceField' in col &&
      (invalidOperationType
        ? col.operationType === invalidOperationType
        : selectedColumn && col.operationType === selectedColumn.operationType)
  ) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = _.uniq(fieldColumns, col => col.sourceField);

  uniqueColumnsByField.sort((column1, column2) => {
    return column1.sourceField.localeCompare(column2.sourceField);
  });

  const fieldOptions = uniqueColumnsByField.map(col => ({
    label: col.sourceField,
    value: col.operationId,
  }));

  return (
    <EuiFlexItem>
      <EuiPopover
        id={columnId}
        className="lnsConfigPanel__summaryPopover"
        anchorClassName="lnsConfigPanel__summaryPopoverAnchor"
        button={
          <EuiButton
            onClick={() => {
              setSettingsOpen(true);
            }}
          >
            {selectedColumn
              ? selectedColumn.label
              : i18n.translate('xpack.lens.indexPattern.configureDimensionLabel', {
                  defaultMessage: 'Configure dimension',
                })}
          </EuiButton>
        }
        isOpen={isSettingsOpen}
        closePopover={() => {
          setSettingsOpen(false);
        }}
        anchorPosition="leftUp"
        withTitle
        panelPaddingSize="s"
      >
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem>
            <FieldSelect {...props} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem
                grow={!ParamEditor}
                className={`lnsConfigPanel__summaryPopoverLeft ${ParamEditor &&
                  'lnsConfigPanel__summaryPopoverLeft--shaded'}`}
              >
                <EuiSideNav items={sideNavItems} />
              </EuiFlexItem>
              <EuiFlexItem>
                {invalidOperationType ? (
                  <EuiCallOut
                    title="Operation not applicable to field"
                    color="danger"
                    iconType="cross"
                  >
                    <p>Please choose another field</p>
                  </EuiCallOut>
                ) : (
                  ParamEditor && (
                    <ParamEditor state={state} setState={setState} columnId={columnId} />
                  )
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    </EuiFlexItem>
  );
}
