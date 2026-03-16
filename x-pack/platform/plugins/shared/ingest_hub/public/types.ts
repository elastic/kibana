/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { IconType } from '@elastic/eui';

export interface IngestFlowProps {
  flowId: string;
}

export interface IngestFlowRegistration {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  category: string;
  order?: number;
  getContent: () => Promise<React.ComponentType<IngestFlowProps>>;
}

export interface IngestHubSetup {
  registerIngestFlow: (flow: IngestFlowRegistration) => void;
}
