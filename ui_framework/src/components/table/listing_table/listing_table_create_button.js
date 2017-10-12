import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiButton,
  KuiButtonIcon,
} from '../../';

export function KuiListingTableCreateButton({ onCreate, ...props }) {
  return (
    <KuiButton
      {...props}
      buttonType="primary"
      onClick={onCreate}
      icon={<KuiButtonIcon type="create" />}
    />
  );
}

KuiListingTableCreateButton.propTypes = {
  onCreate: PropTypes.func
};
