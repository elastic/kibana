/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useConvertIndexToLookup } from '../../../../../hooks/use_convert_index_to_lookup/use_convert_index_to_lookup';
import { ConvertToLookupIndexModal } from './convert_to_lookup_index_modal';

export const ConvertToLookupIndexModalContainer = ({
  onCloseModal,
  onSuccess,
  sourceIndexName,
}: {
  onCloseModal: () => void;
  onSuccess: (lookupIndexName: string) => void;
  sourceIndexName: string;
}) => {
  const { isConverting, errorMessage, convert } = useConvertIndexToLookup({
    sourceIndexName,
    onSuccess,
    onClose: onCloseModal,
  });

  return (
    <ConvertToLookupIndexModal
      onCloseModal={onCloseModal}
      onConvert={convert}
      sourceIndexName={sourceIndexName}
      isConverting={isConverting}
      errorMessage={errorMessage}
    />
  );
};
