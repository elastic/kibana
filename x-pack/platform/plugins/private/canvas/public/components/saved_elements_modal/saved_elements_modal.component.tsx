/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  Fragment,
  ChangeEvent,
  FunctionComponent,
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { sortBy } from 'lodash';
import { CustomElement } from '../../../types';
import { ConfirmModal } from '../confirm_modal/confirm_modal';
import { CustomElementModal } from '../custom_element_modal';
import { ElementGrid } from './element_grid';

const strings = {
  getAddNewElementDescription: () =>
    i18n.translate('xpack.canvas.savedElementsModal.addNewElementDescription', {
      defaultMessage: 'Group and save workpad elements to create new elements',
    }),
  getAddNewElementTitle: () =>
    i18n.translate('xpack.canvas.savedElementsModal.addNewElementTitle', {
      defaultMessage: 'Add new elements',
    }),
  getCancelButtonLabel: () =>
    i18n.translate('xpack.canvas.savedElementsModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getDeleteButtonLabel: () =>
    i18n.translate('xpack.canvas.savedElementsModal.deleteButtonLabel', {
      defaultMessage: 'Delete',
    }),
  getDeleteElementDescription: () =>
    i18n.translate('xpack.canvas.savedElementsModal.deleteElementDescription', {
      defaultMessage: 'Are you sure you want to delete this element?',
    }),
  getDeleteElementTitle: (elementName: string) =>
    i18n.translate('xpack.canvas.savedElementsModal.deleteElementTitle', {
      defaultMessage: `Delete element ''{elementName}''?`,
      values: {
        elementName,
      },
    }),
  getEditElementTitle: () =>
    i18n.translate('xpack.canvas.savedElementsModal.editElementTitle', {
      defaultMessage: 'Edit element',
    }),
  getFindElementPlaceholder: () =>
    i18n.translate('xpack.canvas.savedElementsModal.findElementPlaceholder', {
      defaultMessage: 'Find element',
    }),
  getModalTitle: () =>
    i18n.translate('xpack.canvas.savedElementsModal.modalTitle', {
      defaultMessage: 'My elements',
    }),
  getSavedElementsModalCloseButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadHeader.addElementModalCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
};

export interface Props {
  /**
   * Element add handler
   */
  onAddCustomElement: (customElement: CustomElement) => void;
  /**
   * Handler invoked when the modal closes
   */
  onClose: () => void;
  /**
   * Element delete handler
   */
  onRemoveCustomElement: (id: string) => void;
  /**
   * Element update handler
   */
  onUpdateCustomElement: (id: string, name: string, description: string, image: string) => void;
  /**
   * Array of custom elements to display
   */
  customElements: CustomElement[];
  /**
   * Element search handler
   */
  onSearch: (search: string) => void;
  /**
   * Initial search term
   */
  initialSearch?: string;
}

export const SavedElementsModal: FunctionComponent<Props> = ({
  customElements,
  onAddCustomElement,
  onClose,
  onRemoveCustomElement,
  onUpdateCustomElement,
  onSearch,
  initialSearch = '',
}) => {
  const hasLoadedElements = useRef<boolean>(false);
  const [elementToDelete, setElementToDelete] = useState<CustomElement | null>(null);
  const [elementToEdit, setElementToEdit] = useState<CustomElement | null>(null);
  const [search, setSearch] = useState<string>(initialSearch);

  useEffect(() => {
    if (!hasLoadedElements.current) {
      hasLoadedElements.current = true;
      onSearch('');
    }
  }, [onSearch, hasLoadedElements]);

  const showEditModal = (element: CustomElement) => setElementToEdit(element);
  const hideEditModal = () => setElementToEdit(null);

  const handleEdit = async (name: string, description: string, image: string) => {
    if (elementToEdit) {
      onUpdateCustomElement(elementToEdit.id, name, description, image);
    }
    hideEditModal();
  };

  const showDeleteModal = (element: CustomElement) => setElementToDelete(element);
  const hideDeleteModal = () => setElementToDelete(null);

  const handleDelete = async () => {
    if (elementToDelete) {
      onRemoveCustomElement(elementToDelete.id);
    }
    hideDeleteModal();
  };

  const renderEditModal = () => {
    if (!elementToEdit) {
      return null;
    }

    return (
      <CustomElementModal
        title={strings.getEditElementTitle()}
        name={elementToEdit.displayName}
        description={elementToEdit.help}
        image={elementToEdit.image}
        onSave={handleEdit}
        onCancel={hideEditModal}
      />
    );
  };

  const renderDeleteModal = () => {
    if (!elementToDelete) {
      return null;
    }

    return (
      <ConfirmModal
        isOpen
        title={strings.getDeleteElementTitle(elementToDelete.displayName)}
        message={strings.getDeleteElementDescription()}
        confirmButtonText={strings.getDeleteButtonLabel()}
        cancelButtonText={strings.getCancelButtonLabel()}
        onConfirm={handleDelete}
        onCancel={hideDeleteModal}
      />
    );
  };

  const sortElements = (elements: CustomElement[]): CustomElement[] =>
    sortBy(elements, 'displayName');

  const onFieldSearch = (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  let customElementContent = (
    <EuiEmptyPrompt
      iconType="vector"
      title={<h2>{strings.getAddNewElementTitle()}</h2>}
      body={<p>{strings.getAddNewElementDescription()}</p>}
      titleSize="s"
    />
  );

  if (customElements.length) {
    customElementContent = (
      <ElementGrid
        elements={sortElements(customElements)}
        filterText={search}
        onClick={onAddCustomElement}
        onEdit={showEditModal}
        onDelete={showDeleteModal}
      />
    );
  }

  return (
    <Fragment>
      <EuiModal
        onClose={onClose}
        className="canvasModal--fixedSize"
        maxWidth="1000px"
        initialFocus=".canvasElements__filter input"
      >
        <EuiModalHeader className="canvasAssetManager__modalHeader">
          <EuiModalHeaderTitle className="canvasAssetManager__modalHeaderTitle">
            {strings.getModalTitle()}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody style={{ paddingRight: '1px' }}>
          <EuiFieldSearch
            fullWidth
            value={search}
            placeholder={strings.getFindElementPlaceholder()}
            onChange={onFieldSearch}
          />
          <EuiSpacer />
          {customElementContent}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton size="s" onClick={onClose} data-test-subj="saved-elements-modal-close-button">
            {strings.getSavedElementsModalCloseButtonLabel()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>

      {renderDeleteModal()}
      {renderEditModal()}
    </Fragment>
  );
};
