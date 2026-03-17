/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import type { IngestFlowRegistration } from '../types';

interface IngestFlowTileProps {
  flow: IngestFlowRegistration;
  onClick: () => void;
}

export const IngestFlowTile: React.FC<IngestFlowTileProps> = ({ flow, onClick }) => {
  return (
    <EuiCard
      icon={<EuiIcon type={flow.icon} size="xl" aria-hidden={true} />}
      title={flow.title}
      description={flow.description}
      onClick={onClick}
      layout="horizontal"
      hasBorder
    />
  );
};
