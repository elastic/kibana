import PropTypes from 'prop-types';
import React, { Component } from 'react';

export class GuidePage extends Component {
  constructor(props) {
    super(props);

    this.onClickLink = this.onClickLink.bind(this);
  }

  onClickLink(id) {
    // Scroll to element.
    $('html, body').animate({ // eslint-disable-line no-undef
      scrollTop: $(`#${id}`).offset().top - 100 // eslint-disable-line no-undef
    }, 250);
  }

  render() {
    return (
      <div>
        {this.props.children}
      </div>
    );
  }
}

GuidePage.propTypes = {
  children: PropTypes.any,
  title: PropTypes.string,
  sections: PropTypes.array,
};
