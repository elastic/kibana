/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation } from '../../../common/types/annotations';
import { Privileges } from '../../../common/types/privileges';

// TODO This is not a complete representation of all methods of `ml.*`.
// It just satisfies needs for other parts of the code area which use
// TypeScript and rely on the methods typed in here.
// This allows the import of `ml` into TypeScript code.
interface EsIndex {
  name: string;
}

declare interface Ml {
  annotations: {
    deleteAnnotation(id: string | undefined): Promise<any>;
    indexAnnotation(annotation: Annotation): Promise<object>;
  };

  dataFrame: {
    getDataFrameTransforms(jobId?: string): Promise<any>;
    getDataFrameTransformsStats(jobId?: string): Promise<any>;
    createDataFrameTransformsJob(jobId: string, jobConfig: any): Promise<any>;
    deleteDataFrameTransformsJob(jobId: string): Promise<any>;
    getDataFrameTransformsPreview(payload: any): Promise<any>;
    startDataFrameTransformsJob(jobId: string): Promise<any>;
    stopDataFrameTransformsJob(jobId: string): Promise<any>;
    getTransformAuditMessages(transformId: string): Promise<any>;
  };

  hasPrivileges(obj: object): Promise<any>;
  checkMlPrivileges(): Promise<{ capabilities: Privileges; upgradeInProgress: boolean }>;
  esSearch: any;
  getIndices(): Promise<EsIndex[]>;

  getTimeFieldRange(obj: object): Promise<any>;
}

declare const ml: Ml;
