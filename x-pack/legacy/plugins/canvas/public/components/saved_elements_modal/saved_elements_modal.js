/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiSpacer,
  EuiOverlayMask,
  EuiButton,
} from '@elastic/eui';
import { map, sortBy } from 'lodash';
import { ConfirmModal } from '../confirm_modal/confirm_modal';
import { CustomElementModal } from '../custom_element_modal';
import { ComponentStrings } from '../../../i18n';
import { ElementGrid } from './element_grid';

const { SavedElementsModal: strings } = ComponentStrings;

export class SavedElementsModal extends Component {
  static propTypes = {
    addCustomElement: PropTypes.func.isRequired,
    customElements: PropTypes.array.isRequired,
    findCustomElements: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    removeCustomElement: PropTypes.func.isRequired,
    search: PropTypes.string,
    setCustomElements: PropTypes.func.isRequired,
    setSearch: PropTypes.func.isRequired,
    updateCustomElement: PropTypes.func.isRequired,
  };

  state = {
    elementToDelete: null,
    elementToEdit: null,
  };

  componentDidMount() {
    // fetch custom elements
    this.props.findCustomElements();
  }

  _showEditModal = elementToEdit => this.setState({ elementToEdit });
  _hideEditModal = () => this.setState({ elementToEdit: null });

  _handleEdit = async (name, description, image) => {
    const { updateCustomElement } = this.props;
    const { elementToEdit } = this.state;
    await updateCustomElement(elementToEdit.id, name, description, image);
    this._hideEditModal();
  };

  _showDeleteModal = elementToDelete => this.setState({ elementToDelete });
  _hideDeleteModal = () => this.setState({ elementToDelete: null });

  _handleDelete = async () => {
    const { removeCustomElement } = this.props;
    const { elementToDelete } = this.state;
    await removeCustomElement(elementToDelete.id);
    this._hideDeleteModal();
  };

  _renderEditModal = () => {
    const { elementToEdit } = this.state;

    if (!elementToEdit) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <CustomElementModal
          title={strings.getEditElementTitle()}
          name={elementToEdit.displayName}
          description={elementToEdit.help}
          image={elementToEdit.image}
          onSave={this._handleEdit}
          onCancel={this._hideEditModal}
        />
      </EuiOverlayMask>
    );
  };

  _renderDeleteModal = () => {
    const { elementToDelete } = this.state;

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
        onConfirm={this._handleDelete}
        onCancel={this._hideDeleteModal}
      />
    );
  };

  _sortElements = elements =>
    sortBy(
      map(elements, (element, name) => ({ name, ...element })),
      'displayName'
    );

  _onSearch = e => this.props.setSearch(e.target.value);

  render() {
    const { search, addCustomElement, onClose } = this.props;
    let { customElements } = this.props;

    let customElementContent = (
      <EuiEmptyPrompt
        iconType="vector"
        title={<h2>{strings.getAddNewElementTitle()}</h2>}
        body={<p>{strings.getAddNewElementDescription()}</p>}
        titleSize="s"
      />
    );

    if (customElements.length) {
      customElements = this._sortElements(customElements);
      customElementContent = (
        <ElementGrid
          elements={customElements}
          filterText={search}
          handleClick={addCustomElement}
          onEdit={this._showEditModal}
          onDelete={this._showDeleteModal}
        />
      );
    }

    return (
      <Fragment>
        <EuiOverlayMask>
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
                onChange={this._onSearch}
              />
              <EuiSpacer />
              {customElementContent}
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButton size="s" onClick={onClose}>
                {strings.getSavedElementsModalCloseButtonLabel()}
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>

        {this._renderDeleteModal()}
        {this._renderEditModal()}
      </Fragment>
    );
  }
}
