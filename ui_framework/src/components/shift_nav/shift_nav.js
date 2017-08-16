import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../icon';

export class KuiShiftNav extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    navItems: PropTypes.object,
  }

  constructor(props) {
    super(props);

    this.state = {
      previousItems: [
        {text: 'Share this dashboard', icon: 'user', id: 1},
        {text: 'Edit / add panels', icon: 'user', id: 2},
        {text: 'Dashboard colors', icon: 'user', id: 3},
        {text: 'Display options', icon: 'user', id: 4},
        {text: 'Edit raw JSON', icon: 'user', id: 5},
        {text: 'Delete Dashboard', icon: 'user', id: 6},
      ],
      currentItems: [
        {text: 'Share this dashboard', icon: 'user', id: 1, children: true},
        {text: 'Edit / add panels', icon: 'user', id: 2},
        {text: 'Dashboard colors', icon: 'user', id: 3},
        {text: 'Display options', icon: 'user', id: 4},
        {text: 'Edit raw JSON', icon: 'user', id: 5},
        {text: 'Delete Dashboard', icon: 'user', id: 6},
      ],
      nextItems: [
        {text: 'Share this dashboard', icon: 'user', id: 1},
        {text: 'Edit / add panels', icon: 'user', id: 2},
        {text: 'Dashboard colors', icon: 'user', id: 3},
        {text: 'Display options', icon: 'user', id: 4},
        {text: 'Edit raw JSON', icon: 'user', id: 5},
        {text: 'Delete Dashboard', icon: 'user', id: 6},
      ],
    };
  }

  render() {
    const {
      children,
      className,
      ...rest,
    } = this.props;

    const classes = classNames('kuiShiftNav', className);

    return (
      <div
        className={classes}
        {...rest}
      >
        {this.state.currentItems.map((option, index) => {
          let childIcon = null;
          if (option.children) {
            childIcon = <KuiIcon type="arrowRight" size="medium" className="kuiShiftNav__arrow" />
          }

          return (
            <button className="kuiShiftNav__option" key={option.id}>
              <KuiIcon type={option.icon} size="medium" className="kuiShiftNav__icon" />
              <span className="kuiShiftNav__text">{option.text}</span>
              {childIcon}
            </button>
          );
        })}
      </div>
    );
  }
}
