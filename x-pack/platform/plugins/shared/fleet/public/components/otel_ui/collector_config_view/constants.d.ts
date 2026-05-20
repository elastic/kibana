import type { EuiThemeComputed } from '@elastic/eui';
export declare const OTEL_LOG_INDEX = "logs-collectortelemetry.otel-*";
export type OTelComponentType = 'receiver' | 'processor' | 'connector' | 'exporter' | 'pipeline';
export declare const COMPONENT_TYPE_VIS_COLORS: Record<OTelComponentType, keyof EuiThemeComputed['colors']['vis']>;
export declare const COMPONENT_TYPE_LABELS: Record<OTelComponentType, string>;
