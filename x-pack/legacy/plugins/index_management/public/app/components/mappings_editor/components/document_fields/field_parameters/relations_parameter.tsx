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
  TextField,
  getUseField,
  UseArray,
  FieldConfig,
  fieldValidators,
} from '../../../shared_imports';
import { Field } from '../../../types';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

const UseField = getUseField({ component: TextField });

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
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.joinType.relations.parentFieldLabel', {
    defaultMessage: 'Parent',
  }),
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
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.joinType.relations.childFieldLabel', {
    defaultMessage: 'Child',
  }),
  validations: [
    {
      validator: fieldValidators.emptyField(
        i18n.translate(
          'xpack.idxMgmt.mappingsEditor.joinType.validations.childIsRequiredErrorMessage',
          {
            defaultMessage: 'Specify a child',
          }
        )
      ),
    },
  ],
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
      // description={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldDescription', {
      //   defaultMessage:
      //     'Account for field length when scoring queries. Norms require significant memory and are not necessary for fields that are used solely for filtering or aggregations.',
      // })}
      // docLink={{
      //   text: i18n.translate('xpack.idxMgmt.mappingsEditor.normsDocLinkText', {
      //     defaultMessage: 'Norms documentation',
      //   }),
      //   href: documentationService.getNormsLink(),
      // }}
      withToggle={false}
    >
      <UseArray path="relations">
        {({ items: relationItems, addItem: addRelationItem, removeItem: removeRelationItem }) => {
          return (
            <>
              {relationItems.length > 1 && (
                <>
                  {renderWarning()}
                  <EuiSpacer />
                </>
              )}
              {relationItems.map(({ id: relationId, path: relationPath, isNew: isNewRelation }) => {
                return (
                  <div key={relationId}>
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        {/* By adding ".parent" to the path, we are saying that we want an **object**
                    to be created for each array item, with a "parent" property */}
                        <UseField
                          path={`${relationPath}.parent`}
                          config={parentConfig}
                          // For newly created relations, we don't want to read
                          // the default value from the form as... it is new! :)
                          readDefaultValueOnForm={!isNewRelation}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        {/* Extra div to get out of flex flow */}
                        <div>
                          {/* Nested array under the "children" property of the relation (array) item */}
                          <UseArray
                            path={`${relationPath}.children`}
                            readDefaultValueOnForm={!isNewRelation}
                          >
                            {({
                              items: childrenItems,
                              addItem: addChildItem,
                              removeItem: removeChildItem,
                            }) => {
                              const totalChildren = childrenItems.length;
                              return (
                                <>
                                  {/* Extra div to be able to target css :last-child */}
                                  <div>
                                    {childrenItems.map(
                                      ({ id: childId, path: childPath, isNew: isNewChild }) => {
                                        return (
                                          <div
                                            key={`${relationId}-${childId}`}
                                            className="mappingsEditor__dynamicItem"
                                          >
                                            <>
                                              <UseField
                                                path={childPath}
                                                config={childConfig}
                                                readDefaultValueOnForm={
                                                  !isNewRelation && !isNewChild
                                                }
                                              />

                                              <EuiButtonIcon
                                                className="mappingsEditor__dynamicItem__removeButton"
                                                color="danger"
                                                onClick={() =>
                                                  totalChildren === 1
                                                    ? removeRelationItem(relationId)
                                                    : removeChildItem(childId)
                                                }
                                                iconType="cross"
                                                aria-label={i18n.translate(
                                                  'xpack.idxMgmt.mappingsEditor.joinType.addRelationButtonLabel',
                                                  {
                                                    defaultMessage: 'Remove child',
                                                  }
                                                )}
                                              />
                                            </>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                  <EuiSpacer size="s" />
                                  <EuiTextAlign textAlign="right">
                                    <EuiButtonEmpty
                                      onClick={addChildItem}
                                      data-test-subj="addChildRelationButton"
                                      size="xs"
                                    >
                                      {i18n.translate(
                                        'xpack.idxMgmt.mappingsEditor.joinType.addChildRelationButtonLabel',
                                        {
                                          defaultMessage: 'Add child',
                                        }
                                      )}
                                    </EuiButtonEmpty>
                                  </EuiTextAlign>
                                </>
                              );
                            }}
                          </UseArray>
                        </div>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                );
              })}

              <EuiSpacer size="s" />

              <EuiButtonEmpty
                onClick={addRelationItem}
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
