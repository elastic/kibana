/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSideNav,
  EuiCallOut,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import classNames from 'classnames';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import { IndexPatternDimensionPanelProps, OperationFieldSupportMatrix } from './dimension_panel';
import {
  operationDefinitionMap,
  getOperationDisplay,
  buildColumn,
  changeField,
} from '../operations';
import { deleteColumn, changeColumn } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPattern, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';

const operationPanels = getOperationDisplay();

export interface PopoverEditorProps extends IndexPatternDimensionPanelProps {
  selectedColumn?: IndexPatternColumn;
  operationFieldSupportMatrix: OperationFieldSupportMatrix;
  currentIndexPattern: IndexPattern;
}

function asOperationOptions(operationTypes: OperationType[], compatibleWithCurrentField: boolean) {
  return [...operationTypes]
    .sort((opType1, opType2) => {
      return operationPanels[opType1].displayName.localeCompare(
        operationPanels[opType2].displayName
      );
    })
    .map(operationType => ({
      operationType,
      compatibleWithCurrentField,
    }));
}

export function PopoverEditor(props: PopoverEditorProps) {
  const {
    selectedColumn,
    operationFieldSupportMatrix,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
    uniqueLabel,
    hideGrouping,
  } = props;
  const { operationByField, fieldByOperation } = operationFieldSupportMatrix;
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [
    incompatibleSelectedOperationType,
    setInvalidOperationType,
  ] = useState<OperationType | null>(null);

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;

  const fieldMap: Record<string, IndexPatternField> = useMemo(() => {
    const fields: Record<string, IndexPatternField> = {};
    currentIndexPattern.fields.forEach(field => {
      fields[field.name] = field;
    });
    return fields;
  }, [currentIndexPattern]);

  function getOperationTypes() {
    const possibleOperationTypes = Object.keys(fieldByOperation) as OperationType[];
    const validOperationTypes: OperationType[] = [];

    if (!selectedColumn) {
      validOperationTypes.push(...(Object.keys(fieldByOperation) as OperationType[]));
    } else if (hasField(selectedColumn) && operationByField[selectedColumn.sourceField]) {
      validOperationTypes.push(...operationByField[selectedColumn.sourceField]!);
    }

    return _.uniq(
      [
        ...asOperationOptions(validOperationTypes, true),
        ...asOperationOptions(possibleOperationTypes, false),
      ],
      'operationType'
    );
  }

  function getSideNavItems() {
    return [
      {
        name: '',
        id: '0',
        items: getOperationTypes().map(({ operationType, compatibleWithCurrentField }) => ({
          name: operationPanels[operationType].displayName,
          id: operationType as string,
          className: classNames('lnsPopoverEditor__operation', {
            'lnsPopoverEditor__operation--selected': Boolean(
              incompatibleSelectedOperationType === operationType ||
                (!incompatibleSelectedOperationType &&
                  selectedColumn &&
                  selectedColumn.operationType === operationType)
            ),
            'lnsPopoverEditor__operation--incompatible': !compatibleWithCurrentField,
          }),
          'data-test-subj': `lns-indexPatternDimension${
            compatibleWithCurrentField ? '' : 'Incompatible'
          }-${operationType}`,
          onClick() {
            if (!selectedColumn || !compatibleWithCurrentField) {
              const possibleFields = fieldByOperation[operationType] || [];

              if (possibleFields.length === 1) {
                setState(
                  changeColumn({
                    state,
                    layerId,
                    columnId,
                    newColumn: buildColumn({
                      columns: props.state.layers[props.layerId].columns,
                      suggestedPriority: props.suggestedPriority,
                      layerId: props.layerId,
                      op: operationType,
                      indexPattern: currentIndexPattern,
                      field: fieldMap[possibleFields[0]],
                    }),
                  })
                );
              } else {
                setInvalidOperationType(operationType);
              }
              trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
              return;
            }
            if (incompatibleSelectedOperationType) {
              setInvalidOperationType(null);
            }
            if (selectedColumn.operationType === operationType) {
              return;
            }
            const newColumn: IndexPatternColumn = buildColumn({
              columns: props.state.layers[props.layerId].columns,
              suggestedPriority: props.suggestedPriority,
              layerId: props.layerId,
              op: operationType,
              indexPattern: currentIndexPattern,
              field: fieldMap[selectedColumn.sourceField],
            });
            trackUiEvent(
              `indexpattern_dimension_operation_from_${selectedColumn.operationType}_to_${operationType}`
            );
            setState(
              changeColumn({
                state,
                layerId,
                columnId,
                newColumn,
              })
            );
          },
        })),
      },
    ];
  }

  return (
    <EuiPopover
      id={columnId}
      className="lnsPopoverEditor"
      anchorClassName={selectedColumn ? 'lnsPopoverEditor__anchor' : 'lnsPopoverEditor__link'}
      button={
        selectedColumn ? (
          <EuiLink
            className="lnsPopoverEditor__link"
            onClick={() => {
              setPopoverOpen(!isPopoverOpen);
            }}
            data-test-subj="indexPattern-configure-dimension"
            aria-label={i18n.translate('xpack.lens.configure.editConfig', {
              defaultMessage: 'Edit configuration',
            })}
            title={i18n.translate('xpack.lens.configure.editConfig', {
              defaultMessage: 'Edit configuration',
            })}
          >
            {uniqueLabel}
          </EuiLink>
        ) : (
          <>
            <EuiButtonEmpty
              iconType="plusInCircleFilled"
              data-test-subj="indexPattern-configure-dimension"
              aria-label={i18n.translate('xpack.lens.configure.addConfig', {
                defaultMessage: 'Add a configuration',
              })}
              title={i18n.translate('xpack.lens.configure.addConfig', {
                defaultMessage: 'Add a configuration',
              })}
              onClick={() => setPopoverOpen(!isPopoverOpen)}
              size="xs"
            >
              <FormattedMessage
                id="xpack.lens.configure.emptyConfig"
                defaultMessage="Drop a field here"
              />
            </EuiButtonEmpty>
          </>
        )
      }
      isOpen={isPopoverOpen}
      closePopover={() => {
        setPopoverOpen(false);
        setInvalidOperationType(null);
      }}
      anchorPosition="leftUp"
      withTitle
      panelPaddingSize="s"
    >
      {isPopoverOpen && (
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem>
            <FieldSelect
              currentIndexPattern={currentIndexPattern}
              existingFields={state.existingFields}
              showEmptyFields={state.showEmptyFields}
              fieldMap={fieldMap}
              operationFieldSupportMatrix={operationFieldSupportMatrix}
              selectedColumnOperationType={selectedColumn && selectedColumn.operationType}
              selectedColumnSourceField={
                selectedColumn && hasField(selectedColumn) ? selectedColumn.sourceField : undefined
              }
              incompatibleSelectedOperationType={incompatibleSelectedOperationType}
              onDeleteColumn={() => {
                setState(
                  deleteColumn({
                    state,
                    layerId,
                    columnId,
                  })
                );
              }}
              onChoose={choice => {
                let column: IndexPatternColumn;
                if (
                  !incompatibleSelectedOperationType &&
                  selectedColumn &&
                  'field' in choice &&
                  choice.operationType === selectedColumn.operationType
                ) {
                  // If we just changed the field are not in an error state and the operation didn't change,
                  // we use the operations onFieldChange method to calculate the new column.
                  column = changeField(selectedColumn, currentIndexPattern, fieldMap[choice.field]);
                } else {
                  // Otherwise we'll use the buildColumn method to calculate a new column
                  const compatibleOperations =
                    ('field' in choice &&
                      operationFieldSupportMatrix.operationByField[choice.field]) ||
                    [];
                  let operation;
                  if (compatibleOperations.length > 0) {
                    operation =
                      incompatibleSelectedOperationType &&
                      compatibleOperations.includes(incompatibleSelectedOperationType)
                        ? incompatibleSelectedOperationType
                        : compatibleOperations[0];
                  } else if ('field' in choice) {
                    operation = choice.operationType;
                  }
                  column = buildColumn({
                    columns: props.state.layers[props.layerId].columns,
                    field: fieldMap[choice.field],
                    indexPattern: currentIndexPattern,
                    layerId: props.layerId,
                    suggestedPriority: props.suggestedPriority,
                    op: operation as OperationType,
                  });
                }

                setState(
                  changeColumn({
                    state,
                    layerId,
                    columnId,
                    newColumn: column,
                    keepParams: false,
                  })
                );
                setInvalidOperationType(null);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={null} className={classNames('lnsPopoverEditor__left')}>
                <EuiSideNav items={getSideNavItems()} />
              </EuiFlexItem>
              <EuiFlexItem grow={true} className="lnsPopoverEditor__right">
                {incompatibleSelectedOperationType && selectedColumn && (
                  <EuiCallOut
                    data-test-subj="indexPattern-invalid-operation"
                    title={i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                      defaultMessage: 'To use this function, select a different field.',
                    })}
                    color="warning"
                    size="s"
                    iconType="sortUp"
                  />
                )}
                {incompatibleSelectedOperationType && !selectedColumn && (
                  <EuiCallOut
                    size="s"
                    data-test-subj="indexPattern-fieldless-operation"
                    title={i18n.translate('xpack.lens.indexPattern.fieldlessOperationLabel', {
                      defaultMessage: 'To use this function, select a field.',
                    })}
                    iconType="sortUp"
                  />
                )}
                {!incompatibleSelectedOperationType && ParamEditor && (
                  <>
                    <ParamEditor
                      state={state}
                      setState={setState}
                      columnId={columnId}
                      currentColumn={state.layers[layerId].columns[columnId]}
                      storage={props.storage}
                      uiSettings={props.uiSettings}
                      savedObjectsClient={props.savedObjectsClient}
                      layerId={layerId}
                      http={props.http}
                      dateRange={props.dateRange}
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
                {!incompatibleSelectedOperationType && selectedColumn && (
                  <EuiFormRow
                    label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
                      defaultMessage: 'Label',
                      description: 'Label of a column of data',
                    })}
                    display="rowCompressed"
                  >
                    <EuiFieldText
                      compressed
                      data-test-subj="indexPattern-label-edit"
                      value={selectedColumn.label}
                      onChange={e => {
                        setState(
                          changeColumn({
                            state,
                            layerId,
                            columnId,
                            newColumn: {
                              ...selectedColumn,
                              label: e.target.value,
                            },
                          })
                        );
                      }}
                    />
                  </EuiFormRow>
                )}

                {!hideGrouping && (
                  <BucketNestingEditor
                    layer={state.layers[props.layerId]}
                    columnId={props.columnId}
                    setColumns={columnOrder => {
                      setState({
                        ...state,
                        layers: {
                          ...state.layers,
                          [props.layerId]: {
                            ...state.layers[props.layerId],
                            columnOrder,
                          },
                        },
                      });
                    }}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
}
