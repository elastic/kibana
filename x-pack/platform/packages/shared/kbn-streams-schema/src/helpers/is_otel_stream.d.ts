import type { Streams } from '../models/streams';
/**
 * Determines whether a stream should conform to OpenTelemetry (OTel) naming convention or not.
 *
 * A stream should conform to OTel in the following cases:
 * - If it is a wired stream whose root is NOT `logs.ecs` (ECS wired streams use ECS naming)
 * - If its name matches the pattern `logs-*.otel-*`
 *
 * @param stream - The stream definition to check
 * @returns boolean - true if the stream should conform to OTel naming convention, false otherwise
 */
export declare const OTEL_CONTENT_FIELD = "body.text";
export declare const ECS_CONTENT_FIELD = "message";
export declare const OTEL_SEVERITY_FIELD = "severity_text";
export declare const ECS_SEVERITY_FIELD = "log.level";
export declare function isOtelStream(stream: Streams.all.Definition): boolean;
