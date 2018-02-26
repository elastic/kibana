import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { TagsSelect } from './tags_select';

import {
  EuiFilterGroup,
} from '@elastic/eui';

export class TagsInput extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <EuiFilterGroup>
        <TagsSelect
          find={this.props.find}
        />
      </EuiFilterGroup>
    );
  }
}

TagsInput.propTypes = {
  find: PropTypes.func.isRequired,
};
