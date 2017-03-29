import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

const ICON_TYPES = [
  'create',
  'delete',
  'previous',
  'next',
  'loading',
];

const KuiButtonIcon = props => {
  const typeToClassNameMap = {
    create: 'fa-plus',
    delete: 'fa-trash',
    previous: 'fa-chevron-left',
    next: 'fa-chevron-right',
    loading: 'fa-spinner fa-spin',
  };

  const iconClasses = classNames('kuiButton__icon kuiIcon', props.className, {
    [typeToClassNameMap[props.type]]: props.type,
  });

  return (
    <span className={iconClasses} />
  );
};

KuiButtonIcon.propTypes = {
  type: PropTypes.oneOf(ICON_TYPES),
  className: PropTypes.string,
};

export {
  ICON_TYPES,
  KuiButtonIcon,
};
