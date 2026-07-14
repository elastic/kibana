import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { OTLPExporterNodeConfigBase } from '@opentelemetry/otlp-exporter-base';
/**
 * This exporter exists because Phoenix /v1/traces responds with JSON
 * which is not spec-compliant. It will cause a warning to be logged.
 */
export declare class PhoenixProtoExporter extends OTLPTraceExporter {
    constructor(config?: OTLPExporterNodeConfigBase);
}
