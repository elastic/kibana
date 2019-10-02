/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, FC } from 'react';
import { Redirect } from 'react-router-dom';

import { EuiButton, EuiModal, EuiOverlayMask, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { VisType } from 'ui/vis';

import { SearchSelection } from '../../../../../../../../../../src/legacy/core_plugins/kibana/public/visualize/wizard/search_selection';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

import { BASE_PATH } from '../../../../constants';

export const CreateTransformButton: FC = () => {
  const [isSearchSelectionVisible, setIsSearchSelectionVisible] = useState(false);
  const [savedObjectId, setSavedObjectId] = useState<string | null>(null);
  const { capabilities } = useContext(AuthorizationContext);

  if (savedObjectId !== null) {
    return <Redirect to={`${BASE_PATH}/create_transform/${savedObjectId}`} />;
  }

  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform;

  const onCloseModal = () => setIsSearchSelectionVisible(false);
  const onOpenModal = () => setIsSearchSelectionVisible(true);

  const fakeVisType = {
    name: 'transform',
    title: 'transform',
  } as VisType;

  const createTransformButton = (
    <>
      <EuiButton
        disabled={disabled}
        fill
        onClick={onOpenModal}
        iconType="plusInCircle"
        size="s"
        data-test-subj="transformButtonCreate"
      >
        <FormattedMessage
          id="xpack.transform.transformList.createTransformButton"
          defaultMessage="Create transform"
        />
      </EuiButton>
      {isSearchSelectionVisible && (
        <EuiOverlayMask>
          <EuiModal onClose={onCloseModal} className="transformCreateTransformSearchDialog">
            <SearchSelection onSearchSelected={setSavedObjectId} visType={fakeVisType} />
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );

  if (disabled) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canCreateTransform')}>
        {createTransformButton}
      </EuiToolTip>
    );
  }

  return createTransformButton;
};
