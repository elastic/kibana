import type { AgentBuilderUiClickElementKind, ReportUiClickParams } from '@kbn/agent-builder-common/telemetry';
export declare function classifyInteractiveKind(el: Element): AgentBuilderUiClickElementKind;
export declare function isClickableTarget(el: Element): boolean;
/** Skip telemetry when the control is disabled or marked non-interactive. */
export declare function isInteractiveDisabled(el: Element): boolean;
export declare function resolveAgentBuilderUiClickPayload(event: MouseEvent, mountRoot: HTMLElement, locationPathname: string): ReportUiClickParams | null;
