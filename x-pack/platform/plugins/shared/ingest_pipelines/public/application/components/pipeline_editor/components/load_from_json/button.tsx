/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';

import type { OnDoneLoadJsonHandler } from './modal_provider';
import { ModalProvider } from './modal_provider';

interface Props {
  onDone: OnDoneLoadJsonHandler;
}

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.loadFromJson.buttonLabel', {
    defaultMessage: 'Import processors',
  }),
};

export const LoadFromJsonButton: FunctionComponent<Props> = ({ onDone }) => {
  return (
    <ModalProvider onDone={onDone}>
      {(openModal) => {
        return (
          <EuiButtonEmpty size="s" onClick={openModal} iconType="importAction">
            {i18nTexts.buttonLabel}
          </EuiButtonEmpty>
        );
      }}
    </ModalProvider>
  );
};
