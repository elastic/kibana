import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { TagsSelect } from './tags_select';

import {
  EuiFilterGroup,
} from '@elastic/eui';

export class TagsInput extends Component {

  constructor(props) {
    super(props);

    console.log("tags", this.props.tags);
  }

  render() {
    return (
      <EuiFilterGroup>
        <TagsSelect
          find={this.props.find}
          onSelect={this.props.onSelect}
        />
      </EuiFilterGroup>
    );
  }
}

TagsInput.propTypes = {
  find: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  tags: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
};
