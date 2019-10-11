/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiModalBody,
  EuiTabbedContent,
  EuiEmptyPrompt,
  EuiSearchBar,
  EuiSpacer,
  EuiOverlayMask,
} from '@elastic/eui';
import { map, sortBy } from 'lodash';
import { ConfirmModal } from '../confirm_modal/confirm_modal';
import { CustomElementModal } from '../custom_element_modal';
import { getTagsFilter } from '../../lib/get_tags_filter';
import { extractSearch } from '../../lib/extract_search';
import { ElementGrid } from './element_grid';

const tagType = 'badge';
export class ElementTypes extends Component {
  static propTypes = {
    addCustomElement: PropTypes.func.isRequired,
    addElement: PropTypes.func.isRequired,
    customElements: PropTypes.array.isRequired,
    elements: PropTypes.object,
    filterTags: PropTypes.arrayOf(PropTypes.string).isRequired,
    findCustomElements: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    removeCustomElement: PropTypes.func.isRequired,
    search: PropTypes.string,
    setCustomElements: PropTypes.func.isRequired,
    setSearch: PropTypes.func.isRequired,
    setFilterTags: PropTypes.func.isRequired,
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
          title="Edit element"
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
        title={`Delete element '${elementToDelete.displayName}'?`}
        message="Are you sure you want to delete this element?"
        confirmButtonText="Delete"
        onConfirm={this._handleDelete}
        onCancel={this._hideDeleteModal}
      />
    );
  };

  _sortElements = elements =>
    sortBy(map(elements, (element, name) => ({ name, ...element })), 'displayName');

  render() {
    const {
      search,
      setSearch,
      addElement,
      addCustomElement,
      filterTags,
      setFilterTags,
    } = this.props;
    let { elements, customElements } = this.props;
    elements = this._sortElements(elements);

    let customElementContent = (
      <EuiEmptyPrompt
        iconType="vector"
        title={<h2>Add new elements</h2>}
        body={<p>Group and save workpad elements to create new elements</p>}
        titleSize="s"
      />
    );

    if (customElements.length) {
      customElements = this._sortElements(customElements);
      customElementContent = (
        <ElementGrid
          elements={customElements}
          filter={search}
          handleClick={addCustomElement}
          showControls
          onEdit={this._showEditModal}
          onDelete={this._showDeleteModal}
        />
      );
    }

    const filters = [getTagsFilter(tagType)];
    const onSearch = ({ queryText }) => {
      const { searchTerm, filterTags } = extractSearch(queryText);
      setSearch(searchTerm);
      setFilterTags(filterTags);
    };

    const tabs = [
      {
        id: 'elements',
        name: 'Elements',
        content: (
          <div className="canvasElements__filter">
            <EuiSpacer />
            <EuiSearchBar
              defaultQuery={search}
              box={{
                placeholder: 'Find element',
                incremental: true,
              }}
              filters={filters}
              onChange={onSearch}
            />
            <EuiSpacer />
            <ElementGrid
              elements={elements}
              filterText={search}
              filterTags={filterTags}
              handleClick={addElement}
            />
          </div>
        ),
      },
      {
        id: 'customElements',
        name: 'My elements',
        content: (
          <Fragment>
            <EuiSpacer />
            <EuiSearchBar
              defaultQuery={search}
              box={{
                placeholder: 'Find element',
                incremental: true,
              }}
              onChange={onSearch}
            />
            <EuiSpacer />
            {customElementContent}
          </Fragment>
        ),
      },
    ];

    return (
      <Fragment>
        <EuiModalBody style={{ paddingRight: '1px' }}>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </EuiModalBody>

        {this._renderDeleteModal()}
        {this._renderEditModal()}
      </Fragment>
    );
  }
}
