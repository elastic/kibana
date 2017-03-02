import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

const KuiButtonIcon = props => {
  const typeToIconClassMap = {
    [KuiButtonIcon.TYPE.CREATE]: 'fa-plus',
    [KuiButtonIcon.TYPE.DELETE]: 'fa-trash',
    [KuiButtonIcon.TYPE.PREVIOUS]: 'fa-chevron-left',
    [KuiButtonIcon.TYPE.NEXT]: 'fa-chevron-right',
  };

  let iconType;

  if (props.type) {
    iconType = typeToIconClassMap[props.type];

    if (iconType === undefined) {
      throw new Error(`KuiButtonIcon type not defined: ${props.type}`);
    }
  }

  const iconClasses = classNames(
    'kuiButton__icon kuiIcon',
    iconType,
    props.classes,
  );

  return (
    <span className={iconClasses} />
  );
};

KuiButtonIcon.TYPE = keyMirror({
  CREATE: null,
  DELETE: null,
  PREVIOUS: null,
  NEXT: null,
});

KuiButtonIcon.propTypes = {
  type: PropTypes.string,
  classes: PropTypes.string,
};

export { KuiButtonIcon };
