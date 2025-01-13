/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { isEmpty } from 'lodash';
import { OWNERS } from '../constants';
import type { HttpApiTagOperation, Owner } from '../constants/types';

/**
 * This type is only used to validate for deletion, it does not check all the fields that should exist in the file
 * metadata.
 */
export const CaseFileMetadataForDeletionRt = rt.strict({
  caseIds: rt.array(rt.string),
});

export type CaseFileMetadataForDeletion = rt.TypeOf<typeof CaseFileMetadataForDeletionRt>;

const FILE_KIND_DELIMITER = 'FilesCases';

export const constructFilesHttpOperationTag = (owner: Owner, operation: HttpApiTagOperation) => {
  return `${owner}${FILE_KIND_DELIMITER}${operation}`;
};

export const constructFileKindIdByOwner = (owner: Owner) => `${owner}${FILE_KIND_DELIMITER}`;

export const constructOwnerFromFileKind = (fileKind: string): Owner | undefined => {
  const splitString = fileKind.split(FILE_KIND_DELIMITER);

  if (splitString.length === 2 && isEmpty(splitString[1]) && isValidOwner(splitString[0])) {
    return splitString[0];
  }
};

const isValidOwner = (ownerToValidate: string): ownerToValidate is Owner => {
  const foundOwner = OWNERS.find((validOwner) => validOwner === ownerToValidate);

  return foundOwner !== undefined;
};
