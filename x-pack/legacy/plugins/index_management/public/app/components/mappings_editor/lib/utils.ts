/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';

import {
  DataType,
  Fields,
  Field,
  NormalizedFields,
  NormalizedField,
  FieldMeta,
  MainType,
  SubType,
  ChildFieldName,
  ParameterName,
  ComboBoxOption,
} from '../types';

import {
  SUB_TYPE_MAP_TO_MAIN,
  MAX_DEPTH_DEFAULT_EDITOR,
  PARAMETERS_DEFINITION,
  TYPE_NOT_ALLOWED_MULTIFIELD,
  TYPE_ONLY_ALLOWED_AT_ROOT_LEVEL,
} from '../constants';

import { State } from '../reducer';
import { FieldConfig } from '../shared_imports';
import { TreeItem } from '../components/tree';

export const getUniqueId = () => {
  return uuid.v4();
};

const getChildFieldsName = (dataType: DataType): ChildFieldName | undefined => {
  if (dataType === 'text' || dataType === 'keyword') {
    return 'fields';
  } else if (dataType === 'object' || dataType === 'nested') {
    return 'properties';
  }
  return undefined;
};

export const getFieldMeta = (field: Field, isMultiField?: boolean): FieldMeta => {
  const childFieldsName = getChildFieldsName(field.type);

  const canHaveChildFields = isMultiField ? false : childFieldsName === 'properties';
  const hasChildFields = isMultiField
    ? false
    : canHaveChildFields &&
      Boolean(field[childFieldsName!]) &&
      Object.keys(field[childFieldsName!]!).length > 0;

  const canHaveMultiFields = childFieldsName === 'fields';
  const hasMultiFields =
    canHaveMultiFields &&
    Boolean(field[childFieldsName!]) &&
    Object.keys(field[childFieldsName!]!).length > 0;

  return {
    childFieldsName,
    canHaveChildFields,
    hasChildFields,
    canHaveMultiFields,
    hasMultiFields,
    isExpanded: false,
  };
};

export const getFieldConfig = (param: ParameterName, prop?: string): FieldConfig => {
  if (prop !== undefined) {
    if (
      !(PARAMETERS_DEFINITION[param] as any).props ||
      !(PARAMETERS_DEFINITION[param] as any).props[prop]
    ) {
      throw new Error(`No field config found for prop "${prop}" on param "${param}" `);
    }
    return (PARAMETERS_DEFINITION[param] as any).props[prop]?.fieldConfig || {};
  }

  return (PARAMETERS_DEFINITION[param] as any)?.fieldConfig || {};
};

/**
 * For "alias" field types, we work internaly by "id" references. When we normalize the fields, we need to
 * replace the actual "path" parameter with the field (internal) `id` the alias points to.
 * This method takes care of doing just that.
 *
 * @param byId The fields map by id
 */

const replaceAliasPathByAliasId = (
  byId: NormalizedFields['byId']
): {
  aliases: NormalizedFields['aliases'];
  byId: NormalizedFields['byId'];
} => {
  const aliases: NormalizedFields['aliases'] = {};

  Object.entries(byId).forEach(([id, field]) => {
    if (field.source.type === 'alias') {
      const aliasTargetField = Object.values(byId).find(
        _field => _field.path.join('.') === field.source.path
      );

      if (aliasTargetField) {
        // we set the path to the aliasTargetField "id"
        field.source.path = aliasTargetField.id;

        // We add the alias field to our "aliases" map
        aliases[aliasTargetField.id] = aliases[aliasTargetField.id] || [];
        aliases[aliasTargetField.id].push(id);
      }
    }
  });

  return { aliases, byId };
};

export const getMainTypeFromSubType = (subType: SubType): MainType =>
  SUB_TYPE_MAP_TO_MAIN[subType] as MainType;

/**
 * In order to better work with the recursive pattern of the mappings `properties`, this method flatten the fields
 * to a `byId` object where the key is the **path** to the field and the value is a `NormalizedField`.
 * The `NormalizedField` contains the field data under `source` and meta information about the capability of the field.
 *
 * @example

// original
{
  myObject: {
    type: 'object',
    properties: {
      name: {
        type: 'text'
      }
    }
  }
}

// normalized
{
  rootLevelFields: ['_uniqueId123'],
  byId: {
    '_uniqueId123': {
      source: { type: 'object' },
      id: '_uniqueId123',
      parentId: undefined,
      hasChildFields: true,
      childFieldsName: 'properties', // "object" type have their child fields under "properties"
      canHaveChildFields: true,
      childFields: ['_uniqueId456'],
    },
    '_uniqueId456': {
      source: { type: 'text' },
      id: '_uniqueId456',
      parentId: '_uniqueId123',
      hasChildFields: false,
      childFieldsName: 'fields', // "text" type have their child fields under "fields"
      canHaveChildFields: true,
      childFields: undefined,
    },
  },
}
 *
 * @param fieldsToNormalize The "properties" object from the mappings (or "fields" object for `text` and `keyword` types)
 */
export const normalize = (fieldsToNormalize: Fields): NormalizedFields => {
  let maxNestedDepth = 0;

  const normalizeFields = (
    props: Fields,
    to: NormalizedFields['byId'],
    paths: string[],
    arrayToKeepRef: string[],
    nestedDepth: number,
    isMultiField: boolean = false,
    parentId?: string
  ): Record<string, any> =>
    Object.entries(props)
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .reduce((acc, [propName, value]) => {
        const id = getUniqueId();
        arrayToKeepRef.push(id);
        const field = { name: propName, ...value } as Field;

        // In some cases for object, the "type" is not defined but the field
        // has properties defined. The mappings editor requires a "type" to be defined
        // so we add it here.
        if (field.type === undefined && field.properties !== undefined) {
          field.type = 'object';
        }

        const meta = getFieldMeta(field, isMultiField);
        const { childFieldsName, hasChildFields, hasMultiFields } = meta;

        if (hasChildFields || hasMultiFields) {
          const nextDepth =
            meta.canHaveChildFields || meta.canHaveMultiFields ? nestedDepth + 1 : nestedDepth;
          meta.childFields = [];
          maxNestedDepth = Math.max(maxNestedDepth, nextDepth);

          normalizeFields(
            field[childFieldsName!]!,
            to,
            [...paths, propName],
            meta.childFields,
            nextDepth,
            meta.canHaveMultiFields,
            id
          );
        }

        const { properties, fields, ...rest } = field;

        const normalizedField: NormalizedField = {
          id,
          parentId,
          nestedDepth,
          isMultiField,
          path: paths.length ? [...paths, propName] : [propName],
          source: rest,
          ...meta,
        };

        acc[id] = normalizedField;

        return acc;
      }, to);

  const rootLevelFields: string[] = [];
  const { byId, aliases } = replaceAliasPathByAliasId(
    normalizeFields(fieldsToNormalize, {}, [], rootLevelFields, 0)
  );

  return {
    byId,
    aliases,
    rootLevelFields,
    maxNestedDepth,
  };
};

/**
 * The alias "path" value internally point to a field "id" (not its path). When we deNormalize the fields,
 * we need to replace the target field "id" by its actual "path", making sure to not mutate our state "fields" object.
 *
 * @param aliases The aliases map
 * @param byId The fields map by id
 */
const replaceAliasIdByAliasPath = (
  aliases: NormalizedFields['aliases'],
  byId: NormalizedFields['byId']
): NormalizedFields['byId'] => {
  const updatedById = { ...byId };

  Object.entries(aliases).forEach(([targetId, aliasesIds]) => {
    const path = updatedById[targetId] ? updatedById[targetId].path.join('.') : '';

    aliasesIds.forEach(id => {
      const aliasField = updatedById[id];
      if (!aliasField) {
        return;
      }
      const fieldWithUpdatedPath: NormalizedField = {
        ...aliasField,
        source: { ...aliasField.source, path },
      };

      updatedById[id] = fieldWithUpdatedPath;
    });
  });

  return updatedById;
};

export const deNormalize = ({ rootLevelFields, byId, aliases }: NormalizedFields): Fields => {
  const serializedFieldsById = replaceAliasIdByAliasPath(aliases, byId);

  const deNormalizePaths = (ids: string[], to: Fields = {}) => {
    ids.forEach(id => {
      const { source, childFields, childFieldsName } = serializedFieldsById[id];
      const { name, ...normalizedField } = source;
      const field: Omit<Field, 'name'> = normalizedField;
      to[name] = field;
      if (childFields) {
        field[childFieldsName!] = {};
        return deNormalizePaths(childFields, field[childFieldsName!]);
      }
    });
    return to;
  };

  return deNormalizePaths(rootLevelFields);
};

/**
 * If we change the "name" of a field, we need to update its `path` and the
 * one of **all** of its child properties or multi-fields.
 *
 * @param field The field who's name has changed
 * @param byId The map of all the document fields
 */
export const updateFieldsPathAfterFieldNameChange = (
  field: NormalizedField,
  byId: NormalizedFields['byId']
): { updatedFieldPath: string[]; updatedById: NormalizedFields['byId'] } => {
  const updatedById = { ...byId };
  const paths = field.parentId ? byId[field.parentId].path : [];

  const updateFieldPath = (_field: NormalizedField, _paths: string[]): void => {
    const { name } = _field.source;
    const path = _paths.length === 0 ? [name] : [..._paths, name];

    updatedById[_field.id] = {
      ..._field,
      path,
    };

    if (_field.hasChildFields || _field.hasMultiFields) {
      _field
        .childFields!.map(fieldId => byId[fieldId])
        .forEach(childField => {
          updateFieldPath(childField, [..._paths, name]);
        });
    }
  };

  updateFieldPath(field, paths);

  return { updatedFieldPath: updatedById[field.id].path, updatedById };
};

/**
 * Retrieve recursively all the children fields of a field
 *
 * @param field The field to return the children from
 * @param byId Map of all the document fields
 */
export const getAllChildFields = (
  field: NormalizedField,
  byId: NormalizedFields['byId']
): NormalizedField[] => {
  const getChildFields = (_field: NormalizedField, to: NormalizedField[] = []) => {
    if (_field.hasChildFields || _field.hasMultiFields) {
      _field
        .childFields!.map(fieldId => byId[fieldId])
        .forEach(childField => {
          to.push(childField);
          getChildFields(childField, to);
        });
    }
    return to;
  };

  return getChildFields(field);
};

/**
 * If we delete an object with child fields or a text/keyword with multi-field,
 * we need to know if any of its "child" fields has an `alias` that points to it.
 * This method traverse the field descendant tree and returns all the aliases found
 * on the field and its possible children.
 */
export const getAllDescendantAliases = (
  field: NormalizedField,
  fields: NormalizedFields,
  aliasesIds: string[] = []
): string[] => {
  const hasAliases = fields.aliases[field.id] && Boolean(fields.aliases[field.id].length);

  if (!hasAliases && !field.hasChildFields && !field.hasMultiFields) {
    return aliasesIds;
  }

  if (hasAliases) {
    fields.aliases[field.id].forEach(id => {
      aliasesIds.push(id);
    });
  }

  if (field.childFields) {
    field.childFields.forEach(id => {
      if (!fields.byId[id]) {
        return;
      }
      getAllDescendantAliases(fields.byId[id], fields, aliasesIds);
    });
  }

  return aliasesIds;
};

/**
 * Helper to retrieve a map of all the ancestors of a field
 *
 * @param fieldId The field id
 * @param byId A map of all the fields by Id
 */
export const getFieldAncestors = (
  fieldId: string,
  byId: NormalizedFields['byId']
): { [key: string]: boolean } => {
  const ancestors: { [key: string]: boolean } = {};
  const currentField = byId[fieldId];
  let parent: NormalizedField | undefined =
    currentField.parentId === undefined ? undefined : byId[currentField.parentId];

  while (parent) {
    ancestors[parent.id] = true;
    parent = parent.parentId === undefined ? undefined : byId[parent.parentId];
  }

  return ancestors;
};

export const filterTypesForMultiField = <T extends string = string>(
  options: ComboBoxOption[]
): ComboBoxOption[] =>
  options.filter(
    option => TYPE_NOT_ALLOWED_MULTIFIELD.includes(option.value as MainType) === false
  );

export const filterTypesForNonRootFields = <T extends string = string>(
  options: ComboBoxOption[]
): ComboBoxOption[] =>
  options.filter(
    option => TYPE_ONLY_ALLOWED_AT_ROOT_LEVEL.includes(option.value as MainType) === false
  );

/**
 * Return the max nested depth of the document fields
 *
 * @param byId Map of all the document fields
 */
export const getMaxNestedDepth = (byId: NormalizedFields['byId']): number =>
  Object.values(byId).reduce((maxDepth, field) => {
    return Math.max(maxDepth, field.nestedDepth);
  }, 0);

/**
 * Create a nested array of fields and its possible children
 * to render a Tree view of them.
 */
export const buildFieldTreeFromIds = (
  fieldsIds: string[],
  byId: NormalizedFields['byId'],
  render: (field: NormalizedField) => JSX.Element | string
): TreeItem[] =>
  fieldsIds.map(id => {
    const field = byId[id];
    const children = field.childFields
      ? buildFieldTreeFromIds(field.childFields, byId, render)
      : undefined;

    return { label: render(field), children };
  });

/**
 * When changing the type of a field, in most cases we want to delete all its child fields.
 * There are some exceptions, when changing from "text" to "keyword" as both have the same "fields" property.
 */
export const shouldDeleteChildFieldsAfterTypeChange = (
  oldType: DataType,
  newType: DataType
): boolean => {
  if (oldType === 'text' && newType !== 'keyword') {
    return true;
  } else if (oldType === 'keyword' && newType !== 'text') {
    return true;
  } else if (oldType === 'object' && newType !== 'nested') {
    return true;
  } else if (oldType === 'nested' && newType !== 'object') {
    return true;
  }

  return false;
};

export const canUseMappingsEditor = (maxNestedDepth: number) =>
  maxNestedDepth < MAX_DEPTH_DEFAULT_EDITOR;

const stateWithValidity: Array<keyof State> = ['configuration', 'fieldsJsonEditor', 'fieldForm'];

export const isStateValid = (state: State): boolean | undefined =>
  Object.entries(state)
    .filter(([key]) => stateWithValidity.includes(key as keyof State))
    .reduce((isValid, { 1: value }) => {
      if (value === undefined) {
        return isValid;
      }

      // If one section validity of the state is "undefined", the mappings validity is also "undefined"
      if (isValid === undefined || value.isValid === undefined) {
        return undefined;
      }

      return isValid && value.isValid;
    }, true as undefined | boolean);
