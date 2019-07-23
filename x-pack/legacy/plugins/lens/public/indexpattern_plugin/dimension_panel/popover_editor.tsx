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
  EuiButton,
} from '@elastic/eui';
import classNames from 'classnames';
import {
  IndexPatternColumn,
  OperationType,
  IndexPattern,
  IndexPatternField,
} from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import {
  operationDefinitionMap,
  getOperationDisplay,
  OperationMapping,
  buildColumnForOperationType,
  buildColumnForField,
  buildColumnForDocument,
} from '../operations';
import { deleteColumn, changeColumn } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField } from '../utils';

const operationPanels = getOperationDisplay();

export interface PopoverEditorProps extends IndexPatternDimensionPanelProps {
  selectedColumn?: IndexPatternColumn;
  filteredOperations: OperationMapping[];
  currentIndexPattern: IndexPattern;
}

export function PopoverEditor(props: PopoverEditorProps) {
  const {
    selectedColumn,
    filteredOperations,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
  } = props;
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
    const possibleOperationTypes = filteredOperations
      .map(operation => operation.applicableOperationTypes)
      .reduce((a, b) => [...a, ...b], [])
      .map(operationType => ({
        operationType,
        compatibleWithCurrentField: false,
      }));
    const validFieldlessOperationTypes = filteredOperations
      .map(op => {
        if (!selectedColumn || (!hasField(selectedColumn) && op.applicableWithoutField)) {
          return op.applicableOperationTypes.filter(
            opType =>
              operationDefinitionMap[opType].getPossibleOperationsForDocument(currentIndexPattern)
                .length !== 0
          );
        } else {
          return [];
        }
      })
      .reduce((a, b) => [...a, ...b], [])
      .map(opType => ({
        operationType: opType,
        compatibleWithCurrentField: true,
      }));
    const validFieldBoundOperationTypes = filteredOperations
      .map(op => {
        if (
          !selectedColumn ||
          (hasField(selectedColumn) && op.applicableFields.includes(selectedColumn.sourceField))
        ) {
          return op.applicableOperationTypes.filter(
            opType =>
              !selectedColumn ||
              operationDefinitionMap[opType].getPossibleOperationsForField(
                fieldMap[selectedColumn.sourceField]
              ).length !== 0
          );
        } else {
          return [];
        }
      })
      .reduce((a, b) => [...a, ...b], [])
      .map(opType => ({
        operationType: opType,
        compatibleWithCurrentField: true,
      }));
    return _.uniq(
      [
        ...validFieldlessOperationTypes,
        ...validFieldBoundOperationTypes,
        ...possibleOperationTypes,
      ],
      'operationType'
    );
  }

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: getOperationTypes().map(({ operationType, compatibleWithCurrentField }) => ({
        name: operationPanels[operationType].displayName,
        id: operationType as string,
        className: classNames('lnsConfigPanel__operation', {
          'lnsConfigPanel__operation--selected': Boolean(
            incompatibleSelectedOperationType === operationType ||
              (!incompatibleSelectedOperationType &&
                selectedColumn &&
                selectedColumn.operationType === operationType)
          ),
          'lnsConfigPanel__operation--incompatible': !compatibleWithCurrentField,
        }),
        'data-test-subj': `lns-indexPatternDimension-${operationType}`,
        onClick() {
          const indexPatternId = props.state.layers[props.layerId].indexPatternId;
          if (!selectedColumn) {
            const possibleFields = _.uniq(
              filteredOperations
                .filter(op => op.applicableOperationTypes.includes(operationType))
                .reduce((list, op) => [...list, ...op.applicableFields], [] as string[])
            );
            const isFieldlessPossible =
              filteredOperations.filter(op => op.applicableWithoutField).length > 0;
            if (
              possibleFields.length === 1 ||
              (possibleFields.length === 0 && isFieldlessPossible)
            ) {
              setState(
                changeColumn({
                  state,
                  layerId,
                  columnId,
                  newColumn: buildColumnForOperationType({
                    // todo think about this
                    index: 0,
                    columns: props.state.layers[props.layerId].columns,
                    suggestedPriority: props.suggestedPriority,
                    layerId: props.layerId,
                    op: operationType,
                    indexPatternId,
                    field: possibleFields.length === 1 ? fieldMap[possibleFields[0]] : undefined,
                  }),
                })
              );
            } else {
              setInvalidOperationType(operationType);
            }
            return;
          }
          if (!compatibleWithCurrentField) {
            setInvalidOperationType(operationType);
            return;
          }
          if (incompatibleSelectedOperationType) {
            setInvalidOperationType(null);
          }
          if (selectedColumn.operationType === operationType) {
            return;
          }
          const newColumn: IndexPatternColumn = buildColumnForOperationType({
            // todo think about this
            index: 0,
            columns: props.state.layers[props.layerId].columns,
            suggestedPriority: props.suggestedPriority,
            layerId: props.layerId,
            op: operationType,
            indexPatternId,
            field: hasField(selectedColumn) ? fieldMap[selectedColumn.sourceField] : undefined,
          });
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

  return (
    <EuiPopover
      id={columnId}
      className="lnsConfigPanel__summaryPopover"
      anchorClassName="lnsConfigPanel__summaryPopoverAnchor"
      button={
        selectedColumn ? (
          <EuiLink
            className="lnsConfigPanel__summaryLink"
            onClick={() => {
              setPopoverOpen(true);
            }}
            data-test-subj="indexPattern-configure-dimension"
          >
            {selectedColumn.label}
          </EuiLink>
        ) : (
          <EuiButton
            className="lnsConfigPanel__summaryLink"
            data-test-subj="indexPattern-configure-dimension"
            onClick={() => setPopoverOpen(true)}
            iconType="plusInCircle"
          />
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
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          <FieldSelect
            fieldMap={fieldMap}
            currentIndexPattern={currentIndexPattern}
            filteredOperations={filteredOperations}
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
              const column =
                choice.type === 'field'
                  ? buildColumnForField({
                      // todo fix
                      index: 0,
                      columns: props.state.layers[props.layerId].columns,
                      field: fieldMap[choice.field],
                      indexPatternId: currentIndexPattern.id,
                      layerId: props.layerId,
                      suggestedPriority: props.suggestedPriority,
                    })
                  : buildColumnForDocument({
                      // todo fix
                      index: 0,
                      columns: props.state.layers[props.layerId].columns,
                      indexPattern: currentIndexPattern,
                      layerId: props.layerId,
                      suggestedPriority: props.suggestedPriority,
                    });

              setState(
                changeColumn({
                  state,
                  layerId,
                  columnId,
                  newColumn: column,
                })
              );
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
              {incompatibleSelectedOperationType && selectedColumn && (
                <EuiCallOut
                  data-test-subj="indexPattern-invalid-operation"
                  title={i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                    defaultMessage: 'Operation not applicable to field',
                  })}
                  color="danger"
                  iconType="cross"
                >
                  <p>
                    <FormattedMessage
                      id="xpack.lens.indexPattern.invalidOperationDescription"
                      defaultMessage="Please choose another field"
                    />
                  </p>
                </EuiCallOut>
              )}
              {incompatibleSelectedOperationType && !selectedColumn && (
                <EuiCallOut
                  size="s"
                  data-test-subj="indexPattern-fieldless-operation"
                  title={i18n.translate('xpack.lens.indexPattern.fieldlessOperationLabel', {
                    defaultMessage: 'Choose a field the operation is applied to',
                  })}
                  iconType="alert"
                ></EuiCallOut>
              )}
              {!incompatibleSelectedOperationType && ParamEditor && (
                <ParamEditor
                  state={state}
                  setState={setState}
                  columnId={columnId}
                  storage={props.storage}
                  dataPlugin={props.dataPlugin}
                  layerId={layerId}
                />
              )}
              {!incompatibleSelectedOperationType && selectedColumn && (
                <EuiFormRow label="Label">
                  <EuiFieldText
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
