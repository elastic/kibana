import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiPopoverTitle } from '../../components';

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
  let panelTitle;

  if (title) {
    if (Boolean(onClose)) {
      panelTitle = (
        <button
          className="kuiContextMenuPanelTitle"
          onClick={onClose}
          data-test-subj="contextMenuPanelTitleButton"
        >
          <span className="kuiContextMenu__itemLayout">
            <span className="kuiContextMenu__icon kuiIcon fa-angle-left" />
            <span className="kuiContextMenu__text">
              {title}
            </span>
          </span>
        </button>
      );
    } else {
      panelTitle = (
        <KuiPopoverTitle>
          <span className="kuiContextMenu__itemLayout">
            {title}
          </span>
        </KuiPopoverTitle>
      );
    }
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
