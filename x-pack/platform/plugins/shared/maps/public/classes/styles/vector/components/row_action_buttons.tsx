/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon } from '@elastic/eui';

const ADD_BUTTON_TITLE = i18n.translate('xpack.maps.addBtnTitle', {
  defaultMessage: 'Add',
});

const DELETE_BUTTON_TITLE = i18n.translate('xpack.maps.deleteBtnTitle', {
  defaultMessage: 'Delete',
});

export const RowActionButtons = ({
  onAdd,
  onRemove,
  showDeleteButton,
}: {
  onAdd: () => void;
  onRemove: () => void;
  showDeleteButton: boolean;
}) => {
  return (
    <div>
      {showDeleteButton ? (
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={DELETE_BUTTON_TITLE}
          title={DELETE_BUTTON_TITLE}
          onClick={onRemove}
        />
      ) : null}
      <EuiButtonIcon
        iconType="plusInCircle"
        color="primary"
        aria-label={ADD_BUTTON_TITLE}
        title={ADD_BUTTON_TITLE}
        onClick={onAdd}
      />
    </div>
  );
};
