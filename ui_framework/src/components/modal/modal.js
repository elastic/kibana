import React, {
  Component,
} from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import FocusTrap from 'focus-trap-react';

export class KuiModal extends Component {
  render() {
    const {
      className,
      children,
      ...rest,
    } = this.props;

    const classes = classnames('kuiModal', className);

    return (
      <FocusTrap
        focusTrapOptions={{
          fallbackFocus: () => this.modal,
        }}
      >
        <div
          ref={node => { this.modal = node; }}
          className={classes}
          {...rest}
        >
          { children }
        </div>
      </FocusTrap>
    );
  }
}

KuiModal.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
