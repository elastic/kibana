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

export interface MappingsConfiguration {
  dynamic: boolean | string;
  date_detection: boolean;
  numeric_detection: boolean;
  dynamic_date_formats: string[];
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
  configuration: OnFormUpdateArg<MappingsConfiguration>;
  documentFields: DocumentFieldsState;
  fields: NormalizedFields;
  fieldForm?: OnFormUpdateArg<any>;
  fieldsJsonEditor: {
    format(): MappingsFields;
    isValid: boolean;
  };
}

export type Action =
  | { type: 'configuration.update'; value: OnFormUpdateArg<MappingsConfiguration> }
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
  const id = getUniqueId();
  const { fieldToAddFieldTo } = state.documentFields;
  const addToRootLevel = fieldToAddFieldTo === undefined;
  const parentField = addToRootLevel ? undefined : state.fields.byId[fieldToAddFieldTo!];
  const isMultiField = parentField ? parentField.canHaveMultiFields : false;

  const rootLevelFields = addToRootLevel
    ? [...state.fields.rootLevelFields, id]
    : [...state.fields.rootLevelFields];
  const nestedDepth =
    parentField && (parentField.canHaveChildFields || parentField.canHaveMultiFields)
      ? parentField.nestedDepth + 1
      : 0;
  const maxNestedDepth = Math.max(state.fields.maxNestedDepth, nestedDepth);
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

  state.fields.byId[id] = newField;

  if (parentField) {
    const childFields = parentField.childFields || [];

    // Update parent field with new children
    state.fields.byId[fieldToAddFieldTo!] = {
      ...parentField,
      childFields: [...childFields, id],
      hasChildFields: parentField.canHaveChildFields,
      hasMultiFields: parentField.canHaveMultiFields,
      isExpanded: true,
    };
  }

  return {
    ...state,
    isValid: isStateValid(state),
    fields: { ...state.fields, rootLevelFields, maxNestedDepth },
  };
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'configuration.update': {
      const nextState = {
        ...state,
        configuration: action.value,
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
      const { id, parentId, hasChildFields, hasMultiFields } = field;

      let { rootLevelFields } = state.fields;

      if (parentId) {
        // Deleting a child field, we need to update its parent meta
        const parentField = { ...state.fields.byId[parentId] };
        parentField.childFields = parentField.childFields!.filter(childId => childId !== id);
        parentField.hasChildFields =
          parentField.canHaveChildFields && Boolean(parentField.childFields.length);
        parentField.hasMultiFields =
          parentField.canHaveMultiFields && Boolean(parentField.childFields.length);

        if (!parentField.hasChildFields && !parentField.hasMultiFields) {
          parentField.isExpanded = false;
        }

        state.fields.byId[parentId] = parentField;
      } else {
        // Deleting a root level field
        rootLevelFields = rootLevelFields.filter(childId => childId !== id);
      }

      if (hasChildFields || hasMultiFields) {
        const allChildFields = getAllChildFields(field, state.fields.byId);
        allChildFields!.forEach(childField => {
          delete state.fields.byId[childField.id];
        });
      }

      // Finally... we delete the field from our map
      delete state.fields.byId[id];

      const maxNestedDepth = getMaxNestedDepth(state.fields.byId);

      return {
        ...state,
        fields: {
          ...state.fields,
          rootLevelFields,
          maxNestedDepth,
        },
      };
    }
    case 'field.edit': {
      const fieldToEdit = state.documentFields.fieldToEdit!;
      const previousField = state.fields.byId[fieldToEdit!];

      let newField: NormalizedField = {
        ...previousField,
        source: action.value,
      };

      const nameHasChanged = newField.source.name !== previousField.source.name;
      const typeHasChanged = newField.source.type !== previousField.source.type;

      if (typeHasChanged) {
        // The field `type` has changed, we need to update its meta information
        // and delete all its children fields.

        const shouldDeleteChildFields = shouldDeleteChildFieldsAfterTypeChange(
          previousField.source.type,
          newField.source.type
        );

        newField = {
          ...newField,
          ...getFieldMeta(action.value, newField.isMultiField),
          hasChildFields: shouldDeleteChildFields ? false : previousField.hasChildFields,
          hasMultiFields: shouldDeleteChildFields ? false : previousField.hasMultiFields,
          isExpanded: previousField.isExpanded,
        };

        if (shouldDeleteChildFields) {
          newField.childFields = undefined;

          if (previousField.childFields) {
            const allChildFields = getAllChildFields(previousField, state.fields.byId);
            allChildFields!.forEach(childField => {
              delete state.fields.byId[childField.id];
            });
          }
        }
      }

      if (nameHasChanged) {
        // If the name has changed, we need to update the `path` of the field and recursively
        // the paths of all its "descendant" fields (child or multi-field)
        const { path, byId } = updateFieldsPathAfterFieldNameChange(newField, state.fields.byId);
        newField.path = path;
        state.fields.byId = byId;
      }

      state.fields.byId[fieldToEdit] = newField;

      return {
        ...state,
        isValid: isStateValid(state),
        fieldForm: undefined,
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
