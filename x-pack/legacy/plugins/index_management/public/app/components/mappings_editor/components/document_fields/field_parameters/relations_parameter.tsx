/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiSpacer,
  EuiTextAlign,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  UseField,
  UseArray,
  FieldConfig,
  fieldValidators,
  TextField,
  ComboBoxField,
} from '../../../shared_imports';
import { Field } from '../../../types';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

// This is the Elasticsearch interface to declare relations
interface RelationsES {
  [parent: string]: string | string[];
}

// Internally we will use this type for "relations" as it is more UI friendly
// to loop over the relations and its children
type RelationsInternal = Array<{ parent: string; children: string[] }>;

/**
 * Export custom serializer to be used when we need to serialize the form data to be sent to ES
 * @param field The field to be serialized
 */
export const relationsSerializer = (field: Field): Field => {
  if (field.relations === undefined) {
    return field;
  }

  const relations = field.relations as RelationsInternal;
  const relationsSerialized = relations.reduce(
    (acc, item) => ({
      ...acc,
      [item.parent]: item.children.length === 1 ? item.children[0] : item.children,
    }),
    {} as RelationsES
  );

  return {
    ...field,
    relations: relationsSerialized,
  };
};

/**
 * Export custom deserializer to be used when we need to deserialize the data coming from ES
 * @param field The field to be serialized
 */
export const relationsDeserializer = (field: Field): Field => {
  if (field.relations === undefined) {
    return field;
  }

  const relations = field.relations as RelationsES;
  const relationsDeserialized = Object.entries(relations).map(([parent, children]) => ({
    parent,
    children: typeof children === 'string' ? [children] : children,
  }));

  return {
    ...field,
    relations: relationsDeserialized,
  };
};

const parentConfig: FieldConfig = {
  // label: i18n.translate('xpack.idxMgmt.mappingsEditor.joinType.relations.parentFieldLabel', {
  //   defaultMessage: 'Parent',
  // }),
  validations: [
    {
      validator: fieldValidators.emptyField(
        i18n.translate(
          'xpack.idxMgmt.mappingsEditor.joinType.validations.parentIsRequiredErrorMessage',
          {
            defaultMessage: 'Specify a parent',
          }
        )
      ),
    },
  ],
};

const childConfig: FieldConfig = {
  // label: i18n.translate('xpack.idxMgmt.mappingsEditor.joinType.relations.childrenFieldLabel', {
  //   defaultMessage: 'Children',
  // }),
  defaultValue: [],
  // validations: [
  //   {
  //     validator: fieldValidators.emptyField(
  //       i18n.translate(
  //         'xpack.idxMgmt.mappingsEditor.joinType.validations.childIsRequiredErrorMessage',
  //         {
  //           defaultMessage: 'Specify a child',
  //         }
  //       )
  //     ),
  //   },
  // ],
};

export const RelationsParameter = () => {
  const renderWarning = () => (
    <EuiCallOut
      color="warning"
      iconType="alert"
      size="s"
      title={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.join.multiLevelsParentJoinWarningTitle"
          defaultMessage="Using multiple levels of relations to replicate a relational model is not recommended. Each level of relation adds an overhead at query time in terms of memory and computation. You should de-normalize your data if you care about performance. {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                href={documentationService.getJoinMultiLevelsPerformanceLink()}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.join.multiLevelsPerformanceDocumentationLink',
                  {
                    defaultMessage: 'Learn more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      }
    />
  );

  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.relationsTitle', {
        defaultMessage: 'Relations',
      })}
      withToggle={false}
    >
      <UseArray path="relations">
        {({ items, addItem, removeItem }) => {
          return (
            <>
              {items.length > 1 && (
                <>
                  {renderWarning()}
                  <EuiSpacer />
                </>
              )}

              {items.length > 0 && (
                <EuiFlexGroup>
                  <EuiFlexItem>Parent</EuiFlexItem>
                  <EuiFlexItem>Children</EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ width: '24px' }} />
                </EuiFlexGroup>
              )}
              {/* Extra div to be able to target the :last-child selector */}
              <div>
                {items.map(({ id: relationId, path: relationPath, isNew: isNewRelation }) => {
                  return (
                    <EuiFlexGroup key={relationId} className="mappingsEditor__dynamicItem">
                      {/* Parent */}
                      <EuiFlexItem>
                        {/* By adding ".parent" to the path, we are saying that we want an **object**
                            to be created for each array item.
                            This object will have a "parent" property with the field value.*/}
                        <UseField
                          path={`${relationPath}.parent`}
                          config={parentConfig}
                          component={TextField}
                          // For a newly created relation, we don't want to read
                          // its default value provided to the form because... it is new! :)
                          readDefaultValueOnForm={!isNewRelation}
                        />
                      </EuiFlexItem>

                      {/* Children */}
                      <EuiFlexItem>
                        <UseField
                          path={`${relationPath}.children`}
                          config={childConfig}
                          component={ComboBoxField}
                          readDefaultValueOnForm={!isNewRelation}
                        />
                      </EuiFlexItem>

                      {/* Row actions */}
                      <EuiFlexItem grow={false} className="mappingsEditor__dynamicItem__actions">
                        <EuiButtonIcon
                          className="mappingsEditor__dynamicItem__removeButton"
                          color="danger"
                          onClick={() => removeItem(relationId)}
                          iconType="minusInCircle"
                          aria-label={i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.joinType.removeRelationshipButtonLabel',
                            {
                              defaultMessage: 'Remove join relationship',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  );
                })}
              </div>
              {/* Add relation button */}
              <EuiButtonEmpty
                onClick={addItem}
                iconType="plusInCircleFilled"
                data-test-subj="addRelationButton"
              >
                {i18n.translate('xpack.idxMgmt.mappingsEditor.joinType.addRelationButtonLabel', {
                  defaultMessage: 'Add relation',
                })}
              </EuiButtonEmpty>
            </>
          );
        }}
      </UseArray>
    </EditFieldFormRow>
  );
};
