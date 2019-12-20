/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OnFormUpdateArg } from './shared_imports';
import { Field, NormalizedFields, NormalizedField, FieldsEditor } from './types';
import {
  getFieldMeta,
  getUniqueId,
  shouldDeleteChildFieldsAfterTypeChange,
  getAllChildFields,
  getMaxNestedDepth,
  isStateValid,
  normalize,
  updateFieldsPathAfterFieldNameChange,
} from './lib';
import { PARAMETERS_DEFINITION } from './constants';

export interface MappingsConfiguration {
  enabled?: boolean;
  throwErrorsForUnmappedFields?: boolean;
  date_detection: boolean;
  numeric_detection: boolean;
  dynamic_date_formats: string[];
  _source: {
    enabled?: boolean;
    includes?: string[];
    excludes?: string[];
  };
}

export interface MappingsFields {
  [key: string]: any;
}

type DocumentFieldsStatus = 'idle' | 'editingField' | 'creatingField';

interface DocumentFieldsState {
  status: DocumentFieldsStatus;
  editor: FieldsEditor;
  fieldToEdit?: string;
  fieldToAddFieldTo?: string;
}

export interface State {
  isValid: boolean | undefined;
  configuration: { defaultValue: MappingsConfiguration } & OnFormUpdateArg<MappingsConfiguration>;
  documentFields: DocumentFieldsState;
  fields: NormalizedFields;
  fieldForm?: OnFormUpdateArg<any>;
  fieldsJsonEditor: {
    format(): MappingsFields;
    isValid: boolean;
  };
}

export type Action =
  | { type: 'configuration.update'; value: Partial<State['configuration']> }
  | { type: 'fieldForm.update'; value: OnFormUpdateArg<any> }
  | { type: 'field.add'; value: Field }
  | { type: 'field.remove'; value: string }
  | { type: 'field.edit'; value: Field }
  | { type: 'field.toggleExpand'; value: { fieldId: string; isExpanded?: boolean } }
  | { type: 'documentField.createField'; value?: string }
  | { type: 'documentField.editField'; value: string }
  | { type: 'documentField.changeStatus'; value: DocumentFieldsStatus }
  | { type: 'documentField.changeEditor'; value: FieldsEditor }
  | { type: 'fieldsJsonEditor.update'; value: { json: { [key: string]: any }; isValid: boolean } };

export type Dispatch = (action: Action) => void;

export const addFieldToState = (field: Field, state: State): State => {
  const updatedFields = { ...state.fields };
  const id = getUniqueId();
  const { fieldToAddFieldTo } = state.documentFields;
  const addToRootLevel = fieldToAddFieldTo === undefined;
  const parentField = addToRootLevel ? undefined : updatedFields.byId[fieldToAddFieldTo!];
  const isMultiField = parentField ? parentField.canHaveMultiFields : false;

  updatedFields.byId = { ...updatedFields.byId };
  updatedFields.rootLevelFields = addToRootLevel
    ? [...updatedFields.rootLevelFields, id]
    : updatedFields.rootLevelFields;

  const nestedDepth =
    parentField && (parentField.canHaveChildFields || parentField.canHaveMultiFields)
      ? parentField.nestedDepth + 1
      : 0;

  updatedFields.maxNestedDepth = Math.max(updatedFields.maxNestedDepth, nestedDepth);

  const { name } = field;
  const path = parentField ? `${parentField.path}.${name}` : name;

  const newField: NormalizedField = {
    id,
    parentId: fieldToAddFieldTo,
    isMultiField,
    source: field,
    path,
    nestedDepth,
    ...getFieldMeta(field, isMultiField),
  };

  updatedFields.byId[id] = newField;

  if (parentField) {
    const childFields = parentField.childFields || [];

    // Update parent field with new children
    updatedFields.byId[fieldToAddFieldTo!] = {
      ...parentField,
      childFields: [...childFields, id],
      hasChildFields: parentField.canHaveChildFields,
      hasMultiFields: parentField.canHaveMultiFields,
      isExpanded: true,
    };
  }

  if (newField.source.type === 'alias') {
    updatedFields.aliases = updateAliasesReferences(newField, updatedFields);
  }

  return {
    ...state,
    isValid: isStateValid(state),
    fields: updatedFields,
  };
};

const updateAliasesReferences = (
  field: NormalizedField,
  { aliases }: NormalizedFields,
  previousTargetPath?: string
): NormalizedFields['aliases'] => {
  const updatedAliases = { ...aliases };
  /**
   * If the field where the alias points to has changed, we need to remove the alias field id from the previous reference array.
   */
  if (previousTargetPath && updatedAliases[previousTargetPath]) {
    updatedAliases[previousTargetPath] = updatedAliases[previousTargetPath].filter(
      id => id !== field.id
    );
  }

  const targetId = field.source.path!;

  if (!updatedAliases[targetId]) {
    updatedAliases[targetId] = [];
  }

  updatedAliases[targetId] = [...updatedAliases[targetId], field.id];

  return updatedAliases;
};

/**
 * Helper to remove a field from our map, in an immutable way.
 * When we remove a field we also need to update its parent "childFields" array, or
 * if there are no parent, we then need to update the "rootLevelFields" array.
 *
 * @param fieldId The field id that has been removed
 * @param byId The fields map by Id
 */
const removeFieldFromMap = (fieldId: string, fields: NormalizedFields): NormalizedFields => {
  let { rootLevelFields } = fields;

  const updatedById = { ...fields.byId };
  const { parentId } = updatedById[fieldId];

  // Remove the field from the map
  delete updatedById[fieldId];

  if (parentId) {
    const parentField = updatedById[parentId];

    if (parentField) {
      // If the parent exist, update its childFields Array
      const childFields = parentField.childFields!.filter(childId => childId !== fieldId);

      updatedById[parentId] = {
        ...parentField,
        childFields,
        hasChildFields: parentField.canHaveChildFields && Boolean(childFields.length),
        hasMultiFields: parentField.canHaveMultiFields && Boolean(childFields.length),
        isExpanded:
          !parentField.hasChildFields && !parentField.hasMultiFields
            ? false
            : parentField.isExpanded,
      };
    }
  } else {
    // If there are no parentId it means that we have deleted a top level field
    // We need to update the root level fields Array
    rootLevelFields = rootLevelFields.filter(childId => childId !== fieldId);
  }

  let updatedFields = {
    ...fields,
    rootLevelFields,
    byId: updatedById,
  };

  if (updatedFields.aliases[fieldId]) {
    // Recursively remove all the alias fields pointing to this field being removed.
    updatedFields = updatedFields.aliases[fieldId].reduce(
      (_updatedFields, aliasId) => removeFieldFromMap(aliasId, _updatedFields),
      updatedFields
    );
    const upddatedAliases = { ...updatedFields.aliases };
    delete upddatedAliases[fieldId];

    return {
      ...updatedFields,
      aliases: upddatedAliases,
    };
  }

  return updatedFields;
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'configuration.update': {
      const nextState = {
        ...state,
        configuration: { ...state.configuration, ...action.value },
      };

      const isValid = isStateValid(nextState);
      nextState.isValid = isValid;
      return nextState;
    }
    case 'fieldForm.update': {
      const nextState = {
        ...state,
        fieldForm: action.value,
      };

      const isValid = isStateValid(nextState);
      nextState.isValid = isValid;

      return nextState;
    }
    case 'documentField.createField': {
      return {
        ...state,
        documentFields: {
          ...state.documentFields,
          fieldToAddFieldTo: action.value,
          status: 'creatingField',
        },
      };
    }
    case 'documentField.editField': {
      return {
        ...state,
        documentFields: {
          ...state.documentFields,
          status: 'editingField',
          fieldToEdit: action.value,
        },
      };
    }
    case 'documentField.changeStatus':
      const isValid = action.value === 'idle' ? state.configuration.isValid : state.isValid;
      return {
        ...state,
        isValid,
        fieldForm: undefined,
        documentFields: {
          ...state.documentFields,
          status: action.value,
          fieldToAddFieldTo: undefined,
          fieldToEdit: undefined,
        },
      };
    case 'documentField.changeEditor': {
      const switchingToDefault = action.value === 'default';
      const fields = switchingToDefault ? normalize(state.fieldsJsonEditor.format()) : state.fields;
      return {
        ...state,
        fields,
        fieldForm: undefined,
        documentFields: {
          ...state.documentFields,
          status: 'idle',
          fieldToAddFieldTo: undefined,
          fieldToEdit: undefined,
          editor: action.value,
        },
      };
    }
    case 'field.add': {
      return addFieldToState(action.value, state);
    }
    case 'field.remove': {
      const field = state.fields.byId[action.value];
      const { id, hasChildFields, hasMultiFields } = field;

      // Remove the field
      let updatedFields = removeFieldFromMap(id, state.fields);

      if (hasChildFields || hasMultiFields) {
        const allChildFields = getAllChildFields(field, state.fields.byId);

        // Remove all of its children
        allChildFields!.forEach(childField => {
          updatedFields = removeFieldFromMap(childField.id, updatedFields);
        });
      }

      // Handle Alias
      if (field.source.type === 'alias' && field.source.path) {
        /**
         * If we delete an alias field, we need to remove its id from the reference Array
         */
        const targetId = field.source.path;
        updatedFields.aliases = {
          ...updatedFields.aliases,
          [targetId]: updatedFields.aliases[targetId].filter(aliasId => aliasId !== id),
        };
      }

      updatedFields.maxNestedDepth = getMaxNestedDepth(updatedFields.byId);

      return {
        ...state,
        fields: updatedFields,
      };
    }
    case 'field.edit': {
      let updatedFields = { ...state.fields };
      const fieldToEdit = state.documentFields.fieldToEdit!;
      const previousField = updatedFields.byId[fieldToEdit!];

      let newField: NormalizedField = {
        ...previousField,
        source: action.value,
      };

      if (newField.source.type === 'alias') {
        updatedFields.aliases = updateAliasesReferences(
          newField,
          updatedFields,
          previousField.source.path
        );
      }

      const nameHasChanged = newField.source.name !== previousField.source.name;
      const typeHasChanged = newField.source.type !== previousField.source.type;

      if (nameHasChanged) {
        // If the name has changed, we need to update the `path` of the field and recursively
        // the paths of all its "descendant" fields (child or multi-field)
        const { updatedFieldPath, updatedById } = updateFieldsPathAfterFieldNameChange(
          newField,
          updatedFields.byId
        );
        newField.path = updatedFieldPath;
        updatedFields.byId = updatedById;
      }

      updatedFields.byId[fieldToEdit] = newField;

      if (typeHasChanged) {
        // The field `type` has changed, we need to update its meta information
        // and delete all its children fields.

        const shouldDeleteChildFields = shouldDeleteChildFieldsAfterTypeChange(
          previousField.source.type,
          newField.source.type
        );

        if (previousField.source.type === 'alias' && previousField.source.path) {
          // The field was previously an alias, now that it is not an alias anymore
          // We need to remove its reference from our state.aliases map
          updatedFields.aliases = {
            ...updatedFields.aliases,
            [previousField.source.path]: updatedFields.aliases[previousField.source.path].filter(
              aliasId => aliasId !== fieldToEdit
            ),
          };
        } else {
          const nextTypeCanHaveAlias = !PARAMETERS_DEFINITION.path.targetTypesNotAllowed.includes(
            newField.source.type
          );

          if (!nextTypeCanHaveAlias && updatedFields.aliases[fieldToEdit]) {
            updatedFields.aliases[fieldToEdit].forEach(aliasId => {
              updatedFields = removeFieldFromMap(aliasId, updatedFields);
            });
            delete updatedFields.aliases[fieldToEdit];
          }
        }

        if (shouldDeleteChildFields && previousField.childFields) {
          const allChildFields = getAllChildFields(previousField, updatedFields.byId);
          allChildFields!.forEach(childField => {
            updatedFields = removeFieldFromMap(childField.id, updatedFields);
          });
        }

        newField = {
          ...newField,
          ...getFieldMeta(action.value, newField.isMultiField),
          childFields: shouldDeleteChildFields ? undefined : previousField.childFields,
          hasChildFields: shouldDeleteChildFields ? false : previousField.hasChildFields,
          hasMultiFields: shouldDeleteChildFields ? false : previousField.hasMultiFields,
          isExpanded: shouldDeleteChildFields ? false : previousField.isExpanded,
        };

        updatedFields.byId[fieldToEdit] = newField;
      }

      updatedFields.maxNestedDepth = getMaxNestedDepth(updatedFields.byId);

      return {
        ...state,
        isValid: isStateValid(state),
        fieldForm: undefined,
        fields: updatedFields,
        documentFields: {
          ...state.documentFields,
          fieldToEdit: undefined,
          status: 'idle',
        },
      };
    }
    case 'field.toggleExpand': {
      const { fieldId, isExpanded } = action.value;
      const previousField = state.fields.byId[fieldId];

      const nextField: NormalizedField = {
        ...previousField,
        isExpanded: isExpanded === undefined ? !previousField.isExpanded : isExpanded,
      };

      return {
        ...state,
        fields: {
          ...state.fields,
          byId: {
            ...state.fields.byId,
            [fieldId]: nextField,
          },
        },
      };
    }
    case 'fieldsJsonEditor.update': {
      const nextState = {
        ...state,
        fieldsJsonEditor: {
          format() {
            return action.value.json;
          },
          isValid: action.value.isValid,
        },
      };

      nextState.isValid = isStateValid(nextState);

      return nextState;
    }
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};
