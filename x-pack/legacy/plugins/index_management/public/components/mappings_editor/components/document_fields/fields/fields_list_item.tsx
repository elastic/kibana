/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import classNames from 'classnames';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiBadge,
  EuiNotificationBadge,
  EuiButtonIcon,
  EuiIcon,
} from '@elastic/eui';

import { NormalizedField, NormalizedFields } from '../../../types';
import {
  TYPE_DEFINITION,
  CHILD_FIELD_INDENT_SIZE,
  LEFT_PADDING_SIZE_FIELD_ITEM_WRAPPER,
} from '../../../constants';
import { FieldsList } from './fields_list';
import { CreateField } from './create_field';
import { DeleteFieldProvider } from './delete_field_provider';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
  isCreateFieldFormVisible: boolean;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  isLastItem: boolean;
  childFieldsArray: NormalizedField[];
  maxNestedDepth: number;
  addField(): void;
  editField(): void;
  toggleExpand(): void;
  treeDepth: number;
}

export const FieldsListItem = React.memo(function FieldListItemComponent({
  field,
  allFields,
  isHighlighted,
  isDimmed,
  isCreateFieldFormVisible,
  areActionButtonsVisible,
  isLastItem,
  childFieldsArray,
  maxNestedDepth,
  addField,
  editField,
  toggleExpand,
  treeDepth,
}: Props) {
  const {
    source,
    isMultiField,
    childFields,
    canHaveChildFields,
    hasChildFields,
    canHaveMultiFields,
    hasMultiFields,
    isExpanded,
  } = field;
  const isAddFieldBtnDisabled = false; // For now, we never disable the Add Child button.
  // const isAddFieldBtnDisabled = field.nestedDepth === MAX_DEPTH_DEFAULT_EDITOR - 1;

  // When there aren't any "child" fields (the maxNestedDepth === 0), there is no toggle icon on the left of any field.
  // For that reason, we need to compensate and substract some indent to left align on the page.
  const substractIndentAmount = maxNestedDepth === 0 ? CHILD_FIELD_INDENT_SIZE * 0.5 : 0;

  const indent = treeDepth * CHILD_FIELD_INDENT_SIZE - substractIndentAmount;

  const indentCreateField =
    (treeDepth + 1) * CHILD_FIELD_INDENT_SIZE +
    LEFT_PADDING_SIZE_FIELD_ITEM_WRAPPER -
    substractIndentAmount;

  const hasDottedLine = isMultiField
    ? isLastItem
      ? false
      : true
    : canHaveMultiFields && isExpanded;

  const renderCreateField = () => {
    if (!isCreateFieldFormVisible) {
      return null;
    }

    return (
      <CreateField
        allFields={allFields}
        isMultiField={canHaveMultiFields}
        paddingLeft={indentCreateField}
        maxNestedDepth={maxNestedDepth}
      />
    );
  };

  const renderActionButtons = () => {
    if (!areActionButtonsVisible) {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        {canHaveChildFields && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={addField} disabled={isAddFieldBtnDisabled}>
              Add child
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={editField}>Edit</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DeleteFieldProvider>
            {deleteField => (
              <EuiButtonEmpty onClick={() => deleteField(field)}>Remove</EuiButtonEmpty>
            )}
          </DeleteFieldProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <li
      className={classNames('mappings-editor__fields-list-item', {
        'mappings-editor__fields-list-item--dotted-line': hasDottedLine,
      })}
    >
      <div
        style={{ paddingLeft: `${indent}px` }}
        className={classNames('mappings-editor__fields-list-item__field', {
          'mappings-editor__fields-list-item__field--selected': isHighlighted,
          'mappings-editor__fields-list-item__field--dim': isDimmed,
        })}
      >
        <div
          className={classNames('mappings-editor__fields-list-item__wrapper', {
            'mappings-editor__fields-list-item__wrapper--indent':
              treeDepth === 0 && maxNestedDepth === 0,
          })}
        >
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className={classNames('mappings-editor__fields-list-item__content', {
              'mappings-editor__fields-list-item__content--toggle':
                hasChildFields || hasMultiFields,
              'mappings-editor__fields-list-item__content--multi-field': isMultiField,
              'mappings-editor__fields-list-item__content--indent':
                !hasChildFields && !hasMultiFields && maxNestedDepth > treeDepth,
            })}
          >
            {(hasChildFields || hasMultiFields) && (
              <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__toggle">
                <EuiButtonIcon
                  color="text"
                  onClick={toggleExpand}
                  iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                  aria-label={`Expand field ${source.name}`}
                />
              </EuiFlexItem>
            )}
            {isMultiField && (
              <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__icon">
                <EuiIcon color="subdued" type="link" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__name">
              {source.name}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{TYPE_DEFINITION[source.type].label}</EuiBadge>
            </EuiFlexItem>
            {canHaveMultiFields && (
              <>
                {hasMultiFields && (
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge onClick={toggleExpand}>
                      {childFields!.length}
                    </EuiNotificationBadge>
                  </EuiFlexItem>
                )}
                {areActionButtonsVisible && (
                  <EuiFlexItem
                    grow={false}
                    className="mappings-editor__fields-list-item__multi-field-button"
                  >
                    <EuiButtonEmpty onClick={addField} iconType="plusInCircleFilled">
                      Add multi-field
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </>
            )}
            <EuiFlexItem className="mappings-editor__fields-list-item__actions">
              {renderActionButtons()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      {Boolean(childFieldsArray.length) && isExpanded && (
        <FieldsList fields={childFieldsArray} treeDepth={treeDepth + 1} />
      )}

      {renderCreateField()}
    </li>
  );
});
