/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiBadge, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMappingsState, useDispatch } from '../../../../mappings_state';
import {
  shouldDeleteChildFieldsAfterTypeChange,
  buildFieldTreeFromIds,
  getAllDescendantAliases,
} from '../../../../lib';
import { NormalizedField, DataType } from '../../../../types';
import { PARAMETERS_DEFINITION } from '../../../../constants';
import { FieldsTree } from '../../../fields_tree';

export type UpdateFieldFunc = (field: NormalizedField) => void;

interface Props {
  children: (saveProperty: UpdateFieldFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  field?: NormalizedField;
  aliases?: string[];
}

export const UpdateFieldProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({
    isModalOpen: false,
  });
  const dispatch = useDispatch();

  const { fields } = useMappingsState();
  const { byId } = fields;

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const updateField: UpdateFieldFunc = field => {
    const previousField = byId[field.id];

    const showConfirmationAfterTypeChanged = (oldType: DataType, newType: DataType): boolean => {
      const { hasChildFields, hasMultiFields } = field;

      if (!hasChildFields && !hasMultiFields) {
        // No child or multi-fields will be deleted, no confirmation needed.
        return false;
      }

      return shouldDeleteChildFieldsAfterTypeChange(oldType, newType);
    };

    if (field.source.type !== previousField.source.type) {
      const aliases = getAllDescendantAliases(field, fields)
        .map(id => byId[id].path)
        .sort();
      const hasAliases = Boolean(aliases.length);
      const nextTypeCanHaveAlias = !PARAMETERS_DEFINITION.path.targetTypesNotAllowed.includes(
        field.source.type
      );

      // We need to check if, by changing the type, we will also
      // delete possible child properties ("fields" or "properties").
      // If we will, we need to warn the user about it.
      const requiresConfirmation =
        hasAliases && !nextTypeCanHaveAlias
          ? true
          : showConfirmationAfterTypeChanged(previousField.source.type, field.source.type);

      if (requiresConfirmation) {
        setState({ isModalOpen: true, field, aliases: hasAliases ? aliases : undefined });
        return;
      }
    }

    dispatch({ type: 'field.edit', value: field.source });
  };

  const confirmTypeUpdate = () => {
    dispatch({ type: 'field.edit', value: state.field!.source });
    closeModal();
  };

  const renderModal = () => {
    const field = state.field!;
    const { childFields } = field;
    const title = `Confirm change '${field.source.name}' type to "${field.source.type}".`;

    const fieldsTree =
      childFields && childFields.length
        ? buildFieldTreeFromIds(childFields, byId, (fieldItem: NormalizedField) => (
            <>
              {fieldItem.source.name}
              {fieldItem.isMultiField && (
                <>
                  {' '}
                  <EuiBadge color="hollow">multi-field</EuiBadge>
                </>
              )}
            </>
          ))
        : null;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={closeModal}
          onConfirm={confirmTypeUpdate}
          cancelButtonText={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.updateField.confirmationModal.cancelButtonLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          buttonColor="danger"
          confirmButtonText={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.updateField.confirmationModal.confirmDescription',
            {
              defaultMessage: 'Confirm type change',
            }
          )}
        >
          <>
            {fieldsTree && (
              <>
                <p>
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.updateField.confirmationModal.deleteFieldsDescription',
                    {
                      defaultMessage: 'This will delete the following fields.',
                    }
                  )}
                </p>
                <FieldsTree fields={fieldsTree} />
              </>
            )}
            {state.aliases && (
              <>
                <p>
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.updateField.confirmationModal.deleteAliasesDescription',
                    {
                      defaultMessage: 'The following aliases will also be deleted.',
                    }
                  )}
                </p>
                <ul>
                  {state.aliases.map(path => (
                    <li key={path}>
                      <EuiCode>{path}</EuiCode>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(updateField)}
      {state.isModalOpen && renderModal()}
    </Fragment>
  );
};
