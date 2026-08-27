/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EncryptedKeyValueFields } from './encrypted_key_value_fields';
import * as i18n from './translations';

export const SecretParamFields: React.FC<{ readOnly: boolean }> = ({ readOnly }) => (
  <EncryptedKeyValueFields
    readOnly={readOnly}
    path="__internal__.secretParams"
    title={i18n.SECRET_PARAMS_TITLE}
    subtitle={i18n.SECRET_PARAMS_SUBTITLE}
    subtitleGrow={true}
    titleTestSubject="httpSecretParamsText"
    panelTestSubject="httpSecretParamPanel"
    keyInputTestSubject="httpSecretParamKeyInput"
    valueInputTestSubject="httpSecretParamValueInput"
    addButtonTestSubject="httpAddSecretParamButton"
    removeButtonTestSubject="httpRemoveSecretParamButton"
    addButtonLabel={i18n.ADD_SECRET_PARAM_BUTTON}
    removeButtonLabel={i18n.DELETE_SECRET_PARAM_BUTTON}
    keyLabel={i18n.KEY_LABEL}
    valueLabel={i18n.VALUE_LABEL}
    missingKeyMessage={i18n.QUERY_PARAM_MISSING_KEY_ERROR}
    missingValueMessage={i18n.QUERY_PARAM_MISSING_VALUE_ERROR}
    duplicateKeyMessage={i18n.SAME_SECRET_PARAM_KEY_ERROR}
    maxItemsMessage={i18n.MAX_SECRET_PARAMS_LIMIT}
    keyTooLongMessage={i18n.QUERY_PARAM_KEY_TOO_LONG}
    valueTooLongMessage={i18n.QUERY_PARAM_VALUE_TOO_LONG}
    validateKey={(value) =>
      typeof value === 'string' && value && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
        ? i18n.SECRET_PARAM_INVALID_KEY_ERROR
        : undefined
    }
  />
);
