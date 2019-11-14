/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiBadge, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMappingsState, useDispatch } from '../../../mappings_state';
import { NormalizedField } from '../../../types';
import { buildFieldTreeFromIds, getAllDescendantAliases } from '../../../lib';
import { FieldsTree } from '../../fields_tree';

type DeleteFieldFunc = (property: NormalizedField) => void;

interface Props {
  children: (deleteProperty: DeleteFieldFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  field?: NormalizedField;
  aliases?: string[];
}

export const DeleteFieldProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const dispatch = useDispatch();
  const { fields } = useMappingsState();
  const { byId } = fields;

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const deleteField: DeleteFieldFunc = field => {
    const { hasChildFields, hasMultiFields } = field;
    const aliases = getAllDescendantAliases(field, fields)
      .map(id => byId[id].path)
      .sort();
    const hasAliases = Boolean(aliases.length);

    if (hasChildFields || hasMultiFields || hasAliases) {
      setState({ isModalOpen: true, field, aliases: hasAliases ? aliases : undefined });
    } else {
      dispatch({ type: 'field.remove', value: field.id });
    }
  };

  const confirmDelete = () => {
    dispatch({ type: 'field.remove', value: state.field!.id });
    closeModal();
  };

  const renderModal = () => {
    const field = state.field!;
    const { isMultiField, childFields } = field;

    const title = `Remove ${isMultiField ? 'multi-field' : 'field'} '${field.source.name}'?`;

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
          onConfirm={confirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.deleteField.confirmationModal.cancelButtonLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          buttonColor="danger"
          confirmButtonText={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.deleteField.confirmationModal.removeButtonLabel',
            {
              defaultMessage: 'Remove',
            }
          )}
        >
          <>
            {fieldsTree && (
              <>
                <p>
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.confirmationModal.deleteFieldsDescription',
                    {
                      defaultMessage: 'This will also delete the following fields.',
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
                    'xpack.idxMgmt.mappingsEditor.confirmationModal.deleteAliasesDescription',
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
      {children(deleteField)}
      {state.isModalOpen && renderModal()}
    </Fragment>
  );
};
