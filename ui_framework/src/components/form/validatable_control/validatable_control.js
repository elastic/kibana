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

  updateValidity() {
    if (this.props.isInvalid) {
      this.control.setCustomValidity('Invalid');
    } else {
      this.control.setCustomValidity('');
    }
  }

  componentDidMount() {
    this.updateValidity();
  }

  componentDidUpdate() {
    this.updateValidity();
  }

  render() {
    return cloneElement(this.props.children, {
      ref: node => {
        this.control = node;

        // Call the original ref, if any
        const { ref } = this.props.children;
        if (typeof ref === 'function') {
          ref(node);
        }
      },
    });
  }
}
