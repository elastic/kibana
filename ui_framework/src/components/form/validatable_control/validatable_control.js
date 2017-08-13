import {
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';

export class KuiValidatableControl extends Component {
  static propTypes = {
    children: PropTypes.node,
    isInvalid: PropTypes.bool,
  }

  componentDidUpdate() {
    if (this.props.isInvalid) {
      this.control.setCustomValidity('Invalid');
    } else {
      this.control.setCustomValidity('');
    }
  }

  render() {
    return cloneElement(this.props.children, {
      ref: node => { this.control = node; },
    });
  }
}
