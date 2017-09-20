import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiIcon, KuiPopoverTitle } from '../../components';

const transitionDirectionAndTypeToClassNameMap = {
  next: {
    in: 'kuiContextMenuPanel-txInLeft',
    out: 'kuiContextMenuPanel-txOutLeft',
  },
  previous: {
    in: 'kuiContextMenuPanel-txInRight',
    out: 'kuiContextMenuPanel-txOutRight',
  },
};

export const KuiContextMenuPanel = ({
  children,
  className,
  onClose,
  title,
  panelRef,
  transitionType,
  transitionDirection,
  ...rest,
}) => {
  let arrow;

  if (Boolean(onClose)) {
    arrow = (
      <KuiIcon
        type="arrowLeft"
        size="medium"
        className="kuiContextMenu__icon"
      />
    );
  }

  let panelTitle;

  if (title) {
    panelTitle = (
      <KuiPopoverTitle>
        <button
          className="kuiContextMenuPanelTitle"
          onClick={onClose}
        >
          <span className="kuiContextMenu__itemLayout">
            {arrow}
            {title}
          </span>
        </button>
      </KuiPopoverTitle>
    );
  }

  const hasTransition = transitionDirection && transitionType;
  const classes = classNames('kuiContextMenuPanel', className, (
    hasTransition ? transitionDirectionAndTypeToClassNameMap[transitionDirection][transitionType] : ''
  ));

  return (
    <div
      ref={panelRef}
      className={classes}
      {...rest}
    >
      {panelTitle}
      {children}
    </div>
  );
};

KuiContextMenuPanel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func,
  panelRef: PropTypes.func,
  transitionType: PropTypes.oneOf(['in', 'out']),
  transitionDirection: PropTypes.oneOf(['next', 'previous']),
};
