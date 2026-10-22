/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { History, Location } from 'history';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { EuiButton } from '@elastic/eui';

import { CreateIndexModal } from './create_index_modal';

export interface CreateIndexButtonProps {
  loadIndices: () => void;
  share?: SharePluginStart;
  dataTestSubj?: string;
  /** Opens the modal on mount. Used by the data management overview create menu. */
  defaultOpen?: boolean;
  history?: History;
  location?: Location;
}

const withoutCreateIndexParam = (search: string): string => {
  const params = new URLSearchParams(search);
  if (!params.has('createIndex')) {
    return search;
  }
  params.delete('createIndex');
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

export const CreateIndexButton = ({
  loadIndices,
  dataTestSubj,
  defaultOpen = false,
  history,
  location,
}: CreateIndexButtonProps) => {
  const [createIndexModalOpen, setCreateIndexModalOpen] = useState<boolean>(defaultOpen);

  const closeModal = () => {
    setCreateIndexModalOpen(false);
    if (!history || !location) {
      return;
    }
    const search = withoutCreateIndexParam(location.search);
    if (search !== location.search) {
      history.replace({ ...location, search });
    }
  };

  return (
    <>
      <EuiButton
        fill
        iconType="plusCircle"
        key="createIndexButton"
        data-test-subj={dataTestSubj || 'createIndexButton'}
        data-telemetry-id="idxMgmt-indexList-createIndexButton"
        onClick={() => setCreateIndexModalOpen(true)}
      >
        <FormattedMessage
          id="xpack.idxMgmt.indexTable.createIndexButton"
          defaultMessage="Create index"
        />
      </EuiButton>
      {createIndexModalOpen && (
        <CreateIndexModal closeModal={closeModal} loadIndices={loadIndices} />
      )}
    </>
  );
};
