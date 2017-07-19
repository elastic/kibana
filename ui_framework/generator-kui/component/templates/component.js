import React, {
  Component,
  PropTypes,
} from 'react';
import classNames from 'classnames';

export class <%= componentName %> extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      children,
      className,
      ...rest,
    } = this.props;

    const classes = classNames('<%= cssClassName %>', className);

    return (
      <div
        className={classes}
        {...rest}
      >
        {children}
      </div>
    );
  }
}

<%= componentName %>.propTypes = {
};
