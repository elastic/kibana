/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import type { DataPhasesFlyoutCommonProps, EditDataPhasesFlyoutChangeMeta } from '../shared';

export interface EditDlmPhasesFlyoutProps extends DataPhasesFlyoutCommonProps {
  initialDsl: IngestStreamLifecycleDSL['dsl'];

  isMissingEnterpriseLicense?: boolean;
  onUpgradeEnterprise?: () => void;
  onMissingDefaultRepository?: () => void;
  onRefreshDefaultRepository?: () => void;
  isRefreshingDefaultRepository?: boolean;
  manageRepositoriesHref?: string;
  defaultRepositoryName?: string;

  onChange: (next: IngestStreamLifecycleDSL['dsl'], meta: EditDataPhasesFlyoutChangeMeta) => void;
  onSave: (next: IngestStreamLifecycleDSL['dsl']) => void;
}
