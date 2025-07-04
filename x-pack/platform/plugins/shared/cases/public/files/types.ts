/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import type { Owner } from '../../common/constants/types';
import type { CasesUiConfigType } from '../containers/types';

export type FilesConfig = CasesUiConfigType['files'];

export type CaseFileKinds = Map<Owner, FileKindBrowser>;
