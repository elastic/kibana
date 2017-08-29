import PropTypes from 'prop-types';
import React from 'react';

import classNames from 'classnames';

const ICON_TYPES = [
  'create',
  'delete',
  'previous',
  'next',
  'loading',
  'settings',
  'menu',
];

const KuiButtonIcon = props => {
  const typeToClassNameMap = {
    create: 'fa-plus',
    delete: 'fa-trash',
    previous: 'fa-chevron-left',
    next: 'fa-chevron-right',
    loading: 'fa-spinner fa-spin',
    settings: 'fa-gear',
    menu: 'fa-bars',
  };

  const iconClasses = classNames('kuiButton__icon kuiIcon', props.className, {
    [typeToClassNameMap[props.type]]: props.type,
  });

  // Purely decorative icons should be hidden from screen readers. Button icons are purely
  // decorate since assisted users will want to click on the button itself, not the icon within.
  // (https://www.w3.org/WAI/GL/wiki/Using_aria-hidden%3Dtrue_on_an_icon_font_that_AT_should_ignore)
  return (
    <span aria-hidden="true" className={iconClasses} />
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
