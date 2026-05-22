/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import { getCaseReferenceId } from './references';

export const partitionByCaseAssociation = <T>(caseId: string, attachments: Array<SavedObject<T>>) =>
  partition(attachments, (attachment) => {
    const caseRefId = getCaseReferenceId(attachment.references);

    return caseId === caseRefId;
  });
