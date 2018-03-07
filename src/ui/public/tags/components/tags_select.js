import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiFilterButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiFieldSearch,
  EuiLoadingChart,
  EuiSpacer,
  EuiFilterSelectItem,
  EuiIcon,
} from '@elastic/eui';

export class TagsSelect extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isFetching: false,
      show: false,
      tags: [],
      search: '',
    };
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchTags = (evt) => {
    const updatedState = {
      isFetching: true,
    };
    if (evt) {
      updatedState.search = evt.target.value;
    }
    this.setState(updatedState, this.debouncedFetch);
  }

  debouncedFetch = _.debounce(async () => {
    const tags = await this.props.find(this.state.search, 10);

    if (!this._isMounted) {
      return;
    }

    this.setState({
      isFetching: false,
      tags: tags,
    });
  }, 300);

  onBtnClick = () => {
    this.setState({
      show: !this.state.show,
    });
    if (this.state.tags.length === 0) {
      this.fetchTags();
    }
  }

  close = () => {
    this.setState({
      show: false,
    });
  }

  renderButton() {
    return (
      <EuiFilterButton
        iconType="arrowDown"
        onClick={this.onBtnClick}
        isSelected={this.state.show}
        hasActiveFilters={true}
      >
        Add Tags
      </EuiFilterButton>
    );
  }

  renderPopoverBody() {
    if (this.state.isFetching) {
      return (
        <div className="euiFilterSelect__items">
          <div className="euiFilterSelect__note">
            <div className="euiFilterSelect__noteContent">
              <EuiLoadingChart size="m" />
              <EuiSpacer size="xs" />
              <p>Loading tags</p>
            </div>
          </div>
        </div>
      );
    } else if (this.state.tags.length === 0) {
      return (
        <div className="euiFilterSelect__note">
          <div className="euiFilterSelect__noteContent">
            <EuiIcon type="minusInCircle" />
            <EuiSpacer size="xs" />
            <p>No tags found</p>
          </div>
        </div>
      );
    }

    return this.state.tags.map(tag => {
      const onClick = () => {
        this.props.onSelect(tag);
      }
      return (
        <EuiFilterSelectItem
          key={tag.id}
          onClick={onClick}
        >
          {tag.title}
        </EuiFilterSelectItem>
      );
    });
  }

  render() {
    return (
      <EuiPopover
        id="popover"
        ownFocus
        button={this.renderButton()}
        isOpen={this.state.show}
        closePopover={this.close}
        panelPaddingSize="none"
        withTitle
        anchorPosition="downLeft"
        panelClassName="euiFilterGroup__popoverPanel"
      >
        <EuiPopoverTitle>
          <EuiFieldSearch
            value={this.state.search}
            onChange={this.fetchTags}
          />
        </EuiPopoverTitle>
        {this.renderPopoverBody()}
      </EuiPopover>
    );
  }
}

TagsSelect.propTypes = {
  find: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};
