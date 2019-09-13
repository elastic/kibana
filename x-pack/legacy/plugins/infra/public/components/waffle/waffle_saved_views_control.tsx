/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSavedViews } from '../../containers/waffle/with_saved_views';
import { WaffleSavedViewsModal } from './waffle_saved_views_modal';
import { WaffleCreateViewModal as WaffleCreateSavedViewModal } from './waffle_create_view_modal';

export const WaffleSavedViewsControl = () => {
  const { loading, views, error, getViews, createView } = useSavedViews();
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const loadViews = useCallback(() => {
    getViews(['INFRA:PLACEHOLDER_1', 'INFRA:PLACEHOLDER_2', 'INFRA:PLACEHOLDER_3']);
    setModalOpen(true);
  }, [false]);

  const saveView = useCallback(() => {
    setCreateModalOpen(true);
  }, [false]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, [false]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, [false]);

  return (
    <>
      <EuiFlexGroup>
        <EuiButtonEmpty onClick={saveView}>
          <FormattedMessage
            defaultMessage="Save View"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty onClick={loadViews}>
          <FormattedMessage
            defaultMessage="Load Views"
            id="xpack.infra.waffle.savedViews.loadViewsLabel"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>
      {modalOpen && <WaffleSavedViewsModal views={views} close={closeModal} />}
      {createModalOpen && <WaffleCreateSavedViewModal close={closeCreateModal} save={createView} />}
    </>
  );
};
