import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { TagsSelect } from './tags_select';

import {
  EuiFilterGroup,
  EuiBadge,
  EuiFilterButton,
} from '@elastic/eui';

export class TagsInput extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    let tags;
    if (this.props.tags.length > 0) {
      tags = this.props.tags.map(tag => {
        const deleteTag = (event) => {
          this.props.onDelete(tag.id);
          event.stopPropagation();
        };
        return (
          <EuiFilterButton key={tag.id}>
            <EuiBadge
              color={tag.color}
              iconType="cross"
              iconSide="right"
              onClick={deleteTag}
            >
              {tag.title}
            </EuiBadge>
          </EuiFilterButton>
        );
      });
    }
    const usedTags = this.props.tags.map(tag => {
      return tag.id;
    });
    return (
      <EuiFilterGroup>
        {tags}
        <TagsSelect
          find={this.props.find}
          onAdd={this.props.onAdd}
          onDelete={this.props.onDelete}
          usedTags={usedTags}
        />
      </EuiFilterGroup>
    );
  }
}

TagsInput.propTypes = {
  find: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  tags: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
};
