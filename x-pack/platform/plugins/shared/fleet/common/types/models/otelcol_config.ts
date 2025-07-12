/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OTelCollectorConfig {
    exensions?: Record<OTelCollectorComponentID,any>;
    receivers?: Record<OTelCollectorComponentID,any>;
    processors?: Record<OTelCollectorComponentID,any>;
    service?: {
        extensions?: OTelCollectorComponentID[];
        pipelines?: Record<OTelCollectorPipelineID,OTelCollectorPipeline>;
    };
}

export interface OTelCollectorPipeline {
    receivers?: OTelCollectorComponentID[];
    processors?: OTelCollectorComponentID[];
    exporters?: OTelCollectorComponentID[];
}

export type OTelCollectorComponentID = string;

export type OTelCollectorSignalType = "logs" | "metrics" | "traces";
export type OTelCollectorPipelineID = OTelCollectorSignalType | `${OTelCollectorSignalType}/${string}`