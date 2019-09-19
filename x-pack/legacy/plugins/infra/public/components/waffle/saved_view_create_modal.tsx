/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiFieldText,
  EuiCheckbox,
  EuiSpacer,
} from '@elastic/eui';
import { SavedViewSavedObject } from './saved_views_toolbar_items';

interface Props {
  close(): void;
  save(view: SavedViewSavedObject, shouldIncludeTime: boolean): void;
}

export const SavedViewCreateModal = ({ close, save }: Props) => {
  const [viewName, setViewName] = useState('');
  const [includeTime, setIncludeTime] = useState(false);
  const textChange = useCallback(e => {
    setViewName(e.target.value);
  }, []);

  const saveView = useCallback(() => {
    save(
      {
        type: 'SAVED_VIEW',
        data: { name: viewName },
      },
      includeTime
    );
    close();
  }, [viewName]);

  const onCheckChange = useCallback(e => setIncludeTime(e.target.checked), []);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={close}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              defaultMessage="Save View"
              id="xpack.infra.waffle.savedView.createHeader"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFieldText
            placeholder={i18n.translate('xpack.infra.waffle.savedViews.viewNamePlaceholder', {
              defaultMessage: 'Name',
            })}
            value={viewName}
            onChange={textChange}
            aria-label="Use aria labels when no actual label is in use"
          />
          <EuiSpacer size="m" />
          <EuiCheckbox
            id={'saved-view-save-time-checkbox'}
            label={
              <FormattedMessage
                defaultMessage="Include time filter?"
                id="xpack.infra.waffle.savedViews.includeTimeFilterLabel"
              />
            }
            checked={includeTime}
            onChange={onCheckChange}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={close}>
            <FormattedMessage
              defaultMessage="Cancel"
              id="xpack.infra.waffle.savedViews.cancelButton"
            />
          </EuiButtonEmpty>
          <EuiButton color="primary" onClick={saveView}>
            <FormattedMessage defaultMessage="Save" id="xpack.infra.waffle.savedViews.saveButton" />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
