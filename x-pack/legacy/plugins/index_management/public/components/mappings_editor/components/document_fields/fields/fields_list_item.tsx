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
  EuiFacetButton,
  EuiButtonIcon,
} from '@elastic/eui';

import { FieldsList } from './fields_list';
import { CreateField } from './create_field';
import { DeleteFieldProvider } from './delete_field_provider';
import { NormalizedField } from '../../../types';

interface Props {
  field: NormalizedField;
  isCreateFieldFormVisible: boolean;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  childFieldsArray: NormalizedField[];
  maxNestedDepth: number;
  addField(): void;
  editField(): void;
  toggleExpand(): void;
  treeDepth: number;
}

const INDENT_SIZE = 32;
const WRAPPER_LEFT_PADDING_SIZE = 4;

export const FieldsListItem = React.memo(function FieldListItemComponent({
  field,
  isHighlighted,
  isDimmed,
  isCreateFieldFormVisible,
  areActionButtonsVisible,
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

  // When there aren't yet any depth (maxNestedDepth === 0), there are no toggle on the left
  // we need to compensate and substract
  const substractIndentAmount = maxNestedDepth === 0 ? INDENT_SIZE * 0.5 : 0;

  const indent = `${treeDepth * INDENT_SIZE - substractIndentAmount}px`;

  const indentCreateField = `${(treeDepth + 1) * INDENT_SIZE +
    WRAPPER_LEFT_PADDING_SIZE -
    substractIndentAmount}px`;

  const renderCreateField = () => {
    if (!isCreateFieldFormVisible) {
      return null;
    }

    return <CreateField paddingLeft={indentCreateField} />;
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
    <>
      <div
        style={{ paddingLeft: indent }}
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
              'mappings-editor__fields-list-item__content--toggle': hasChildFields,
              'mappings-editor__fields-list-item__content--indent':
                !hasChildFields && maxNestedDepth > treeDepth,
            })}
          >
            {hasChildFields && (
              <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__toggle">
                <EuiButtonIcon
                  color="text"
                  onClick={toggleExpand}
                  iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                  aria-label={`Expand field ${source.name}`}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__name">
              {source.name}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{source.type}</EuiBadge>
            </EuiFlexItem>
            {!isMultiField && canHaveMultiFields && (
              <>
                {hasMultiFields && (
                  <EuiFlexItem grow={false}>
                    <EuiFacetButton quantity={childFields!.length}>+</EuiFacetButton>
                  </EuiFlexItem>
                )}
                <EuiFlexItem
                  grow={false}
                  className="mappings-editor__fields-list-item__multi-field-button"
                >
                  <EuiButtonEmpty onClick={addField} iconType="plusInCircleFilled">
                    Add multi-field
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </>
            )}
            {/* {hasMultiFields && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{`${childFields!.length} multi-field`}</EuiBadge>
              </EuiFlexItem>
            )} */}
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
    </>
  );
});
