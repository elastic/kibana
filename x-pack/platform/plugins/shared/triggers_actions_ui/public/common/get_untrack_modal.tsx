/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UntrackAlertsModal } from '../application/sections/common/components/untrack_alerts_modal';
import type { UntrackAlertsModalProps } from '../application/sections/common/components/untrack_alerts_modal';

export const getUntrackModalLazy = (props: UntrackAlertsModalProps) => {
  return <UntrackAlertsModal {...props} />;
};
