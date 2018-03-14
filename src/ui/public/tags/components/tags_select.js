import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiFieldSearch,
  EuiLoadingChart,
  EuiSpacer,
  EuiFilterSelectItem,
  EuiIcon,
  EuiLink,
  EuiFormHelpText,
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
      <EuiLink
        onClick={this.onBtnClick}
      >
        Attach tags
      </EuiLink>
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
      let checked;
      if (this.props.usedTags.includes(tag.id)) {
        checked = 'on';
      }
      const onClick = () => {
        if (checked === 'on') {
          this.props.onDelete(tag.id);
        } else {
          this.props.onAdd(tag);
        }
      };
      return (
        <EuiFilterSelectItem
          key={tag.id}
          onClick={onClick}
          checked={checked}
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
          <EuiFormHelpText style={{ paddingBottom: 0 }}>
            Manage and add tags over in <a href="/app/management/kibana/tags">tag management</a>
          </EuiFormHelpText>
        </EuiPopoverTitle>
        {this.renderPopoverBody()}
      </EuiPopover>
    );
  }
}

TagsSelect.propTypes = {
  find: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  usedTags: PropTypes.arrayOf(PropTypes.string).isRequired,
};
