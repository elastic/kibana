/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButtonIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  TextField,
  getUseField,
  UseArray,
  FieldConfig,
  fieldValidators,
} from '../../../shared_imports';
import { Field } from '../../../types';

// import { documentationService } from '../../../../../services/documentation';
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
      [item.parent]: item.children,
      // [item.parent]: item.children.length === 1 ? item.children[0] : item.children,
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
    children,
    // children: typeof children === 'string' ? [children] : children,
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

export const RelationsParameter = () => (
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
    // formFieldPath="norms"
    withToggle={false}
  >
    <UseArray path="relations">
      {({ items, addItem, removeItem }) => (
        <>
          {items.map(({ id: relationId, path }) => (
            <div key={relationId} className="mappingsEditor__joinType__relationItem">
              <EuiFlexGroup>
                <EuiFlexItem>
                  <UseField path={`${path}.parent`} config={parentConfig} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <UseField path={`${path}.children`} config={childConfig} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiButtonIcon
                className="mappingsEditor__joinType__relationItem__removeButton"
                color="danger"
                onClick={() => removeItem(relationId)}
                iconType="cross"
                aria-label="Next"
              />
            </div>
          ))}

          <EuiSpacer size="s" />

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
      )}
    </UseArray>
  </EditFieldFormRow>
);
