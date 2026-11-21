/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PlaceholderModal } from './placeholder_modal';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

/** Placeholder: a later change replaces this file with the real dialog. */
export const HistoryModal: React.FC<InvestigationModalProps> = ({ onClose }) => (
  <PlaceholderModal
    title={i18n.HISTORY_TITLE}
    onClose={onClose}
    testSubj="investigationHistoryModal"
  />
);
HistoryModal.displayName = 'HistoryModal';
