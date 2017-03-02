import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

const KuiButtonIcon = props => {
  const iconClasses = classNames(
    'kuiButton__icon kuiIcon',
    props.className,
  );

  return (
    <span className={iconClasses} />
  );
};

KuiButtonIcon.propTypes = {
  className: PropTypes.string,
};

const KuiCreateButtonIcon = () => <KuiButtonIcon className="fa-plus" />;
const KuiDeleteButtonIcon = () => <KuiButtonIcon className="fa-trash" />;
const KuiPreviousButtonIcon = () => <KuiButtonIcon className="fa-chevron-left" />;
const KuiNextButtonIcon = () => <KuiButtonIcon className="fa-chevron-right" />;
const KuiLoadingButtonIcon = () => <KuiButtonIcon className="fa-spinner fa-spin" />;

export {
  KuiButtonIcon,
  KuiCreateButtonIcon,
  KuiDeleteButtonIcon,
  KuiPreviousButtonIcon,
  KuiNextButtonIcon,
  KuiLoadingButtonIcon,
};
