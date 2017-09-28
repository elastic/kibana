import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {
  KuiButtonIcon,
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../components';

export const KuiHeaderAlert = ({
  action,
  className,
  date,
  text,
  title,
  ...rest,
}) => {
  const classes = classNames('kuiHeaderAlert', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      <KuiButtonIcon iconType="cross" size="small" className="kuiHeaderAlert__dismiss" />
      <p className="kuiHeaderAlert__title">{title}</p>
      <p className="kuiHeaderAlert__text">{text}</p>
      <KuiFlexGroup justifyContent="spaceBetween">
        <KuiFlexItem grow={false}>
          <div className="kuiHeaderAlert__action kuiLink">{action}</div>
        </KuiFlexItem>
        <KuiFlexItem grow={false}>
          <div className="kuiHeaderAlert__date">
            {date}
          </div>
        </KuiFlexItem>
      </KuiFlexGroup>
    </div>
  );
};

KuiHeaderAlert.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  date: PropTypes.string.isRequired,
  text: PropTypes.string,
  title: PropTypes.string.isRequired,
};
