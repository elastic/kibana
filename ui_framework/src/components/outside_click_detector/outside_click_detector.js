import {
  Children,
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';

export class KuiOutsideClickDetector extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    onOutsideClick: PropTypes.func.isRequired,
  }

  onClickOutside = event => {
    if (!this.wrapperRef) {
      return;
    }

    if (this.wrapperRef === event.target) {
      return;
    }

    if (this.wrapperRef.contains(event.target)) {
      return;
    }

    this.props.onOutsideClick();
  }

  componentDidMount() {
    document.addEventListener('click', this.onClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onClickOutside);
  }

  render() {
    const props = Object.assign({}, this.props.children.props, {
      ref: node => {
        this.wrapperRef = node;
        if (this.props.children.ref) {
          this.props.children.ref(node);
        }
      },
    });

    const child = Children.only(this.props.children);
    return cloneElement(child, props);
  }
}
