import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiDescriptionListTitle,
  KuiDescriptionListDescription,
} from '../../components';

const typesToClassNameMap = {
  row: 'kuiDescriptionList--row',
  column: 'kuiDescriptionList--column',
  inline: 'kuiDescriptionList--inline',
};

export const TYPES = Object.keys(typesToClassNameMap);

const alignmentsToClassNameMap = {
  center: 'kuiDescriptionList--center',
  left: '',
};

export const ALIGNMENTS = Object.keys(alignmentsToClassNameMap);

export const KuiDescriptionList = ({
  children,
  className,
  listItems,
  align,
  compressed,
  type,
  ...rest,
}) => {
  const classes = classNames(
    'kuiDescriptionList',
    typesToClassNameMap[type],
    alignmentsToClassNameMap[align],
    {
      'kuiDescriptionList--compressed': compressed,
    },
    className
  );

  let childrenOrListItems = null;
  if (listItems) {
    childrenOrListItems = (
      listItems.map((item) => {
        return [
          <KuiDescriptionListTitle>{item.title}</KuiDescriptionListTitle>,
          <KuiDescriptionListDescription>{item.description}</KuiDescriptionListDescription>
        ];
      })
    );
  } else {
    childrenOrListItems = children;
  }

  return (
    <dl
      className={classes}
      {...rest}
    >
      {childrenOrListItems}
    </dl>
  );
};

KuiDescriptionList.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  compressed: PropTypes.bool,
  type: PropTypes.oneOf(TYPES),
  align: PropTypes.oneOf(ALIGNMENTS),
};

KuiDescriptionList.defaultProps = {
  type: 'row',
  align: 'left',
  compressed: false,
};
