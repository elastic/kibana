/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type * as H from 'history';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import type { CasesPublicStartDependencies } from '../../../../types';
import type { CasesContextProps } from '../../../cases_context';

export type CasesActionContextProps = Pick<
  CasesContextProps,
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'unifiedAttachmentTypeRegistry'
  | 'getFilesClient'
>;

export interface Services {
  core: CoreStart;
  plugins: CasesPublicStartDependencies;
  history: H.History;
  storage: Storage;
}
