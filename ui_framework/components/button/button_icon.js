import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

const KuiButtonIcon = props => {
  const typeToClassNameMap = {
    [KuiButtonIcon.TYPE.CREATE]: 'fa-plus',
    [KuiButtonIcon.TYPE.DELETE]: 'fa-trash',
    [KuiButtonIcon.TYPE.PREVIOUS]: 'fa-chevron-left',
    [KuiButtonIcon.TYPE.NEXT]: 'fa-chevron-right',
    [KuiButtonIcon.TYPE.LOADING]: 'fa-spinner fa-spin',
  };

  const iconClasses = classNames('kuiButton__icon kuiIcon', props.className, {
    [typeToClassNameMap[KuiButtonIcon.TYPE[props.type]]]: props.type,
  });

  return (
    <span className={iconClasses} />
  );
};

KuiButtonIcon.TYPE = keyMirror({
  CREATE: null,
  DELETE: null,
  PREVIOUS: null,
  NEXT: null,
  LOADING: null,
});

KuiButtonIcon.propTypes = {
  type: PropTypes.string,
  className: PropTypes.string,
};

export {
  KuiButtonIcon,
};
